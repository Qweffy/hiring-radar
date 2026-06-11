"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deadLetters, postings, sweeps } from "@/db/schema";
import { inngest, sweepRequested } from "@/lib/inngest/client";
import { ActionError, runAction, type ActionResult } from "@/lib/result";

/* ------------------------------------------------------------------ */
/* Dead-letter recovery                                                 */
/* ------------------------------------------------------------------ */

/**
 * Re-enqueue one dead-lettered posting through the per-posting worker. Resets
 * the posting to `pending`, re-emits hn/posting.upserted (the same event runSweep
 * fans out, carrying the posting's originating sweep id so the event passes the
 * consumer's schema), then drops the dead-letter row. The DB hash gate keeps the
 * re-run idempotent. Postings whose row was already deleted can only be cleared.
 */
export async function retryDeadLetter(
  deadLetterId: number,
): Promise<ActionResult<{ retried: number }>> {
  return runAction("Couldn't retry the dead letter — try again.", async () => {
    const [row] = await db
      .select({
        id: deadLetters.id,
        postingId: deadLetters.postingId,
        hnId: deadLetters.hnId,
        firstSweepId: postings.firstSweepId,
      })
      .from(deadLetters)
      .leftJoin(postings, eq(deadLetters.postingId, postings.id))
      .where(eq(deadLetters.id, deadLetterId))
      .limit(1);

    if (!row) throw new ActionError("That dead letter no longer exists.");

    if (row.postingId !== null && row.hnId !== null) {
      await reenqueuePosting(row.postingId, row.hnId, row.firstSweepId);
    }

    await db.delete(deadLetters).where(eq(deadLetters.id, deadLetterId));
    revalidatePath("/pipeline");
    return { retried: 1 };
  });
}

/**
 * Reset a posting to `pending` and re-emit hn/posting.upserted. `sweepId` must be
 * a positive integer per the event schema, so fall back to the posting's
 * first-seen sweep, then to the latest sweep, then to 1.
 */
async function reenqueuePosting(
  postingId: number,
  hnId: number,
  firstSweepId: number | null,
): Promise<void> {
  await db
    .update(postings)
    .set({ parseStatus: "pending", parseError: null, updatedAt: new Date() })
    .where(eq(postings.id, postingId));

  let sweepId = firstSweepId ?? 0;
  if (sweepId <= 0) {
    const [latest] = await db
      .select({ id: sweeps.id })
      .from(sweeps)
      .orderBy(desc(sweeps.id))
      .limit(1);
    sweepId = latest?.id ?? 1;
  }

  await inngest.send({
    name: "hn/posting.upserted",
    id: `retry-posting-${postingId}-${Date.now()}`,
    data: { postingId, hnId, sweepId, change: "updated" },
  });
}

/** Re-enqueue every dead letter at once (the "Retry all (N)" panel action). */
export async function retryAllDeadLetters(): Promise<
  ActionResult<{ retried: number }>
> {
  return runAction("Couldn't retry the dead letters — try again.", async () => {
    const rows = await db
      .select({
        id: deadLetters.id,
        postingId: deadLetters.postingId,
        hnId: deadLetters.hnId,
        firstSweepId: postings.firstSweepId,
      })
      .from(deadLetters)
      .leftJoin(postings, eq(deadLetters.postingId, postings.id));

    if (rows.length === 0) return { retried: 0 };

    for (const row of rows) {
      if (row.postingId === null || row.hnId === null) continue;
      await reenqueuePosting(row.postingId, row.hnId, row.firstSweepId);
    }

    await db.delete(deadLetters).where(
      inArray(
        deadLetters.id,
        rows.map((r) => r.id),
      ),
    );
    revalidatePath("/pipeline");
    return { retried: rows.length };
  });
}

/** Permanently drop a dead letter (destructive — gated by a confirm modal). */
export async function discardDeadLetter(
  deadLetterId: number,
): Promise<ActionResult<{ discarded: number }>> {
  return runAction("Couldn't discard the dead letter — try again.", async () => {
    const deleted = await db
      .delete(deadLetters)
      .where(eq(deadLetters.id, deadLetterId))
      .returning({ id: deadLetters.id });

    if (deleted.length === 0) {
      throw new ActionError("That dead letter no longer exists.");
    }
    revalidatePath("/pipeline");
    return { discarded: deleted.length };
  });
}

/* ------------------------------------------------------------------ */
/* Sweep triggers                                                       */
/* ------------------------------------------------------------------ */

const MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * Kick off a sweep for an explicit thread + month (the backfill confirm modal
 * and the "Run first ingest" empty-state both land here). Emits the same
 * hn/sweep.requested event the cron uses, so backfill and live ingest share one
 * durable path. Embeddings are content-hash idempotent — safe to re-run.
 */
export async function requestSweep(input: {
  threadId: number;
  month: string;
  trigger: "manual" | "backfill";
}): Promise<ActionResult<{ requested: true }>> {
  return runAction("Couldn't request the sweep — try again.", async () => {
    if (!Number.isInteger(input.threadId) || input.threadId <= 0) {
      throw new ActionError("Invalid thread id.");
    }
    if (!MONTH_RE.test(input.month)) {
      throw new ActionError("Invalid month — expected YYYY-MM.");
    }

    await inngest.send({
      name: sweepRequested.name,
      id: `sweep-${input.threadId}-${input.trigger}-${Date.now()}`,
      data: {
        threadId: input.threadId,
        month: input.month,
        trigger: input.trigger,
      },
    });

    revalidatePath("/pipeline");
    return { requested: true as const };
  });
}
