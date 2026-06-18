// Inngest v4 functions — triggers live in the options object. The pipeline is:
//
//   discoverThreads (cron) ──hn/sweep.requested──▶ runSweep
//        runSweep ──hn/posting.upserted (fan-out)──▶ processPosting
//        processPosting (onFailure) ─────────────────▶ dead_letters
//
// runSweep owns fetch/diff/sweep-row bookkeeping; processPosting owns the
// per-posting parse → embed with independent retries. This mirrors the manual
// CLI (scripts/ingest.ts) but per-posting and durable.
import { eq } from "drizzle-orm";
import { NonRetriableError, RetryAfterError } from "inngest";
import { z } from "zod";

import { db } from "@/db";
import { deadLetters, sweeps } from "@/db/schema";
import { findLatestHiringThread } from "@/lib/hn/algolia";
import { fetchAndDiff } from "@/lib/ingest/fetch-diff";
import {
  embedPosting,
  isRateLimited,
  markParseFailed,
  parsePosting,
} from "@/lib/ingest/parse";
import { inngest, postingUpserted, sweepRequested } from "@/lib/inngest/client";
import { logger as errorLog } from "@/lib/logger";

// Groq free tier resets its window slowly; back off generously on a 429.
const RATE_LIMIT_RETRY_MS = 60_000;
// One sendEvent caps at 5,000 events; chunk fan-out well under that.
const FANOUT_CHUNK = 200;

// Shape of the internal "inngest/function.failed" payload we read. Not in our
// typed registry, so we validate the fields we log to avoid an `any` leak.
const functionFailedData = z.object({
  function_id: z.string(),
  run_id: z.string(),
});

/* ------------------------------------------------------------------ */
/* discoverThreads — monthly cron that seeds the pipeline               */
/* ------------------------------------------------------------------ */

/**
 * Runs every 6h on days 1–3 (UTC) — "Who is hiring?" threads land on the 1st and
 * accrue comments for days, so re-polling catches the early delta. Finds the
 * latest hiring thread and requests a sweep. The event id is keyed on threadId
 * so repeated cron ticks within the 24h dedup window collapse to one request;
 * the DB upsert in runSweep is the durable guard beyond that window.
 */
export const discoverThreads = inngest.createFunction(
  {
    id: "discover-threads",
    retries: 2,
    triggers: [{ cron: "TZ=UTC 0 */6 1-3 * *" }],
  },
  async ({ step, logger }) => {
    const thread = await step.run("find-latest-thread", async () => {
      return findLatestHiringThread();
    });

    if (thread === null) {
      logger.warn("discoverThreads: no hiring thread found");
      return { discovered: false as const };
    }

    await step.sendEvent("request-sweep", {
      name: sweepRequested.name,
      // Deterministic id → idempotent on the thread within the dedup window.
      id: `sweep-${thread.threadId}`,
      data: { threadId: thread.threadId, month: thread.month, trigger: "cron" },
    });

    return { discovered: true as const, threadId: thread.threadId, month: thread.month };
  },
);

/* ------------------------------------------------------------------ */
/* runSweep — fetch + diff + fan-out                                    */
/* ------------------------------------------------------------------ */

/**
 * On hn/sweep.requested: create a sweep row, fetch + diff the thread, then fan
 * out one hn/posting.upserted per new/changed posting. The sweep row is
 * finalised as completed — per-posting parse status rolls up asynchronously via
 * processPosting (the radar reads live posting counters, not the sweep's parse
 * counts, for the incremental path). Re-runnable: diff upserts on hnId.
 */
export const runSweep = inngest.createFunction(
  {
    id: "run-sweep",
    retries: 3,
    triggers: [sweepRequested],
  },
  async ({ event, step, logger }) => {
    const { threadId, month, trigger } = event.data;

    const sweepId = await step.run("create-sweep", async () => {
      const [row] = await db
        .insert(sweeps)
        .values({ threadId, month, trigger })
        .returning({ id: sweeps.id });
      if (!row) throw new Error("Could not create sweep row");
      return row.id;
    });

    let diff;
    try {
      diff = await step.run("fetch-and-diff", async () => {
        return fetchAndDiff(sweepId, threadId, month);
      });
    } catch (error) {
      // Fetch/diff is the only stage that can sink the whole sweep — record the
      // failure on the sweep row and dead-letter at the fetch stage.
      const message = error instanceof Error ? error.message : String(error);
      await step.run("mark-sweep-failed", async () => {
        await db
          .update(sweeps)
          .set({ status: "failed", error: message.slice(0, 500), finishedAt: new Date(), updatedAt: new Date() })
          .where(eq(sweeps.id, sweepId));
        await db.insert(deadLetters).values({
          stage: "fetch",
          hnId: threadId,
          error: message.slice(0, 1000),
          payload: { threadId, month, trigger },
        });
      });
      throw error;
    }

    // Fan out per posting in chunks. Deterministic event ids keep daily re-polls
    // idempotent within the dedup window; the per-posting hash gate is durable.
    if (diff.changed.length > 0) {
      for (let i = 0; i < diff.changed.length; i += FANOUT_CHUNK) {
        const chunk = diff.changed.slice(i, i + FANOUT_CHUNK);
        await step.sendEvent(
          `fan-out-${i}`,
          chunk.map((c) => ({
            name: postingUpserted.name,
            id: `posting-${c.id}-${c.change}`,
            data: { postingId: c.id, hnId: c.hnId, sweepId, change: c.change },
          })),
        );
      }
    }

    await step.run("finalize-sweep", async () => {
      await db
        .update(sweeps)
        .set({
          status: "completed",
          fetchedCount: diff.counters.fetched,
          newCount: diff.counters.added,
          updatedCount: diff.counters.updated,
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(sweeps.id, sweepId));
    });

    logger.info("runSweep complete", {
      sweepId,
      fetched: diff.counters.fetched,
      new: diff.counters.added,
      updated: diff.counters.updated,
      fannedOut: diff.changed.length,
    });

    return { sweepId, ...diff.counters, fannedOut: diff.changed.length };
  },
);

/* ------------------------------------------------------------------ */
/* processPosting — per-posting parse → embed (incremental path)        */
/* ------------------------------------------------------------------ */

/**
 * On hn/posting.upserted: parse (Groq) then embed, each a retryable step.
 * - 429 → RetryAfterError so we respect the rate window instead of burning
 *   retries against a closed quota.
 * - deterministic parse failure (schema invalid twice) → NonRetriableError;
 *   onFailure then writes a dead_letters row.
 * idempotency on hnId is a consumer-side guard; the DB hash gate is durable.
 */
export const processPosting = inngest.createFunction(
  {
    id: "process-posting",
    retries: 4,
    idempotency: "event.data.hnId",
    triggers: [postingUpserted],
    onFailure: async ({ event, error }) => {
      // Fires once after the final retry. `event` here is the failure wrapper;
      // the original payload is nested under event.data.event and is typed `any`
      // by inngest's FailureEventArgs. Re-validate it with the source-of-truth
      // schema so the dead-letter write is type-safe (Zod-at-boundary) instead of
      // trusting an `any`. A malformed wrapper still records a dead letter.
      const parsedOriginal = postingUpserted.schema.safeParse(
        event.data.event.data,
      );
      const original = parsedOriginal.success ? parsedOriginal.data : null;
      await db.insert(deadLetters).values({
        stage: "parse",
        postingId: original?.postingId,
        hnId: original?.hnId,
        error: error.message.slice(0, 1000),
        payload: original ?? { raw: "unparseable failure payload" },
      });
    },
  },
  async ({ event, step, logger }) => {
    const { postingId, hnId } = event.data;

    const parsed = await step.run("parse", async () => {
      try {
        return await parsePosting(postingId);
      } catch (error) {
        if (isRateLimited(error)) {
          throw new RetryAfterError(
            `Groq rate-limited on hn-${hnId}`,
            RATE_LIMIT_RETRY_MS,
            { cause: error },
          );
        }
        // Validation failed twice in extractPosting — retrying won't help.
        const message = error instanceof Error ? error.message : String(error);
        await markParseFailed(postingId, message);
        errorLog.warn("parse", "posting parse failed", {
          context: { postingId, hnId, error: message },
        });
        throw new NonRetriableError(`parse failed for hn-${hnId}: ${message}`, {
          cause: error,
        });
      }
    });

    if (parsed.kind !== "parsed") {
      logger.info("processPosting: nothing to embed", { hnId, outcome: parsed.kind });
      return { hnId, parsed: parsed.kind, embedded: false };
    }

    const embedResult = await step.run("embed", async () => {
      return embedPosting(postingId);
    });

    return { hnId, parsed: parsed.kind, embedded: embedResult.kind === "embedded" };
  },
);

/* ------------------------------------------------------------------ */
/* failedFunction — global dead-letter listener (cross-app alerting)    */
/* ------------------------------------------------------------------ */

/**
 * Optional safety net: any function in the app that exhausts retries lands here.
 * processPosting already dead-letters its own failures via onFailure; this
 * catches the rest (e.g. runSweep) so nothing fails completely silently.
 */
export const failedFunction = inngest.createFunction(
  {
    id: "pipeline-function-failed",
    retries: 1,
    triggers: [{ event: "inngest/function.failed" }],
  },
  async ({ event, logger }) => {
    // The internal "inngest/function.failed" payload is not in our typed event
    // registry, so event.data is `any`. Validate the two fields we log so this
    // boundary stays type-safe instead of leaking an `any` into the logger.
    const failure = functionFailedData.safeParse(event.data);
    const fnId = failure.success ? failure.data.function_id : "unknown";
    const runId = failure.success ? failure.data.run_id : "unknown";
    logger.error("inngest function failed", { function: fnId, runId });
    errorLog.error("inngest", `function ${fnId} exhausted retries`, {
      context: { function: fnId, runId },
    });
    return { acknowledged: true };
  },
);

export const functions = [discoverThreads, runSweep, processPosting, failedFunction];
