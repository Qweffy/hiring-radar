import "./env";
import { eq, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { postings, sweeps } from "@/db/schema";
import { fetchThread } from "@/lib/hn/algolia";
import { hnHtmlToText } from "@/lib/hn/html-to-text";
import { contentHash } from "@/lib/hash";
import { extractPosting, extractionModel } from "@/lib/llm/extract";
import { normalizePosting } from "@/lib/llm/normalize";

/* ------------------------------------------------------------------ */
/* CLI args                                                             */
/* ------------------------------------------------------------------ */

type Args = {
  thread: number;
  month: string;
  limit: number | null;
  concurrency: number;
  skipFetch: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
  };
  return {
    thread: Number(get("--thread") ?? 48357725),
    month: get("--month") ?? "2026-06",
    limit: get("--limit") ? Number(get("--limit")) : null,
    concurrency: Number(get("--concurrency") ?? 2),
    skipFetch: argv.includes("--skip-fetch"),
  };
}

/* ------------------------------------------------------------------ */
/* Pacing — free tier is TPM-bound: ~8 requests/min (see groq doc)      */
/* ------------------------------------------------------------------ */

const REQUEST_INTERVAL_MS = 7_500;
let nextSlot = 0;

async function acquireSlot(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + REQUEST_INTERVAL_MS;
  if (wait > 0) await sleep(wait);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Phases                                                               */
/* ------------------------------------------------------------------ */

async function markStaleRuns(): Promise<void> {
  await db
    .update(sweeps)
    .set({ status: "failed", error: "interrupted", updatedAt: new Date() })
    .where(eq(sweeps.status, "running"));
}

type FetchCounters = { fetched: number; added: number; updated: number };

async function fetchAndDiff(
  sweepId: number,
  threadId: number,
  month: string,
): Promise<FetchCounters> {
  const { postings: live } = await fetchThread(threadId);
  console.log(`fetched ${live.length} live top-level postings from HN`);

  const stored = await db
    .select({ hnId: postings.hnId, contentHash: postings.contentHash })
    .from(postings)
    .where(eq(postings.threadId, threadId));
  const storedByHnId = new Map(stored.map((r) => [r.hnId, r.contentHash]));

  const seenIds: number[] = [];
  const toInsert: (typeof postings.$inferInsert)[] = [];
  let updated = 0;

  for (const c of live) {
    seenIds.push(c.id);
    const hash = contentHash(c.text);
    const existing = storedByHnId.get(c.id);

    if (existing === undefined) {
      toInsert.push({
        hnId: c.id,
        threadId,
        month,
        author: c.author,
        hnCreatedAt: new Date(c.created_at),
        points: c.points ?? null,
        rawHtml: c.text,
        rawText: hnHtmlToText(c.text),
        contentHash: hash,
        firstSweepId: sweepId,
      });
    } else if (existing !== hash) {
      // Edited posting — refresh content and re-parse.
      await db
        .update(postings)
        .set({
          rawHtml: c.text,
          rawText: hnHtmlToText(c.text),
          contentHash: hash,
          points: c.points ?? null,
          parseStatus: "pending",
          parseError: null,
          isDeleted: false,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(postings.hnId, c.id));
      updated++;
    }
  }

  for (let i = 0; i < toInsert.length; i += 100) {
    await db
      .insert(postings)
      .values(toInsert.slice(i, i + 100))
      .onConflictDoNothing({ target: postings.hnId });
  }

  if (seenIds.length > 0) {
    await db
      .update(postings)
      .set({ lastSeenAt: new Date() })
      .where(and(eq(postings.threadId, threadId), inArray(postings.hnId, seenIds)));

    // Algolia silently drops deleted comments — absent IDs are deletions.
    const absent = stored.map((r) => r.hnId).filter((id) => !seenIds.includes(id));
    if (absent.length > 0) {
      await db
        .update(postings)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(inArray(postings.hnId, absent));
      console.log(`marked ${absent.length} postings as deleted (absent from tree)`);
    }
  }

  return { fetched: live.length, added: toInsert.length, updated };
}

type ParseCounters = { parsed: number; failed: number; skipped: number };

async function parsePending(limit: number | null, concurrency: number): Promise<ParseCounters> {
  const pending = await db
    .select({ id: postings.id, hnId: postings.hnId, rawText: postings.rawText })
    .from(postings)
    .where(and(eq(postings.parseStatus, "pending"), eq(postings.isDeleted, false)))
    .limit(limit ?? 100_000);

  console.log(`${pending.length} postings pending parse (model: ${extractionModel()})`);
  const counters: ParseCounters = { parsed: 0, failed: 0, skipped: 0 };
  const total = pending.length;
  let done = 0;
  const queue = [...pending];

  async function worker(): Promise<void> {
    for (;;) {
      const row = queue.shift();
      if (!row) return;
      await acquireSlot();
      done++;
      try {
        const extracted = normalizePosting(await extractPosting(row.rawText));
        if (!extracted.isJobPosting) {
          await db
            .update(postings)
            .set({
              parseStatus: "skipped",
              parsedAt: new Date(),
              parseModel: extractionModel(),
              updatedAt: new Date(),
            })
            .where(eq(postings.id, row.id));
          counters.skipped++;
          console.log(`[${done}/${total}] skipped hn-${row.hnId} (not a job posting)`);
        } else {
          await db
            .update(postings)
            .set({
              parseStatus: "parsed",
              parsedAt: new Date(),
              parseModel: extractionModel(),
              parseError: null,
              company: extracted.company,
              role: extracted.role,
              location: extracted.location,
              companyStage: extracted.companyStage,
              remotePolicy: extracted.remotePolicy,
              salaryMin: extracted.salaryMin,
              salaryMax: extracted.salaryMax,
              salaryCurrency: extracted.salaryCurrency,
              salaryRaw: extracted.salaryRaw,
              stackTags: extracted.stackTags,
              visaSponsorship: extracted.visaSponsorship,
              contact: extracted.contact,
              updatedAt: new Date(),
            })
            .where(eq(postings.id, row.id));
          counters.parsed++;
          console.log(
            `[${done}/${total}] parsed hn-${row.hnId} — ${extracted.company ?? "?"} · ${extracted.role ?? "?"}`,
          );
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await db
          .update(postings)
          .set({
            parseStatus: "failed",
            parseError: message.slice(0, 500),
            parseModel: extractionModel(),
            updatedAt: new Date(),
          })
          .where(eq(postings.id, row.id));
        counters.failed++;
        console.log(`[${done}/${total}] FAILED hn-${row.hnId} — ${message.slice(0, 120)}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return counters;
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const args = parseArgs();
  const startedAt = Date.now();
  console.log(
    `ingest: thread=${args.thread} month=${args.month}${args.limit ? ` limit=${args.limit}` : ""}${args.skipFetch ? " (skip fetch)" : ""}`,
  );

  await markStaleRuns();

  const [sweep] = await db
    .insert(sweeps)
    .values({ threadId: args.thread, month: args.month, trigger: "manual" })
    .returning({ id: sweeps.id });
  if (!sweep) throw new Error("Could not create sweep row");

  let fetchCounters: FetchCounters = { fetched: 0, added: 0, updated: 0 };
  try {
    if (!args.skipFetch) {
      fetchCounters = await fetchAndDiff(sweep.id, args.thread, args.month);
    }
    const parseCounters = await parsePending(args.limit, args.concurrency);

    const status = parseCounters.failed > 0 ? "partial" : "completed";
    await db
      .update(sweeps)
      .set({
        status,
        fetchedCount: fetchCounters.fetched,
        newCount: fetchCounters.added,
        updatedCount: fetchCounters.updated,
        parsedCount: parseCounters.parsed,
        failedCount: parseCounters.failed,
        skippedCount: parseCounters.skipped,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sweeps.id, sweep.id));

    const mins = ((Date.now() - startedAt) / 60_000).toFixed(1);
    console.log(
      `\nsweep #${sweep.id} ${status} in ${mins}min — fetched ${fetchCounters.fetched} · new ${fetchCounters.added} · updated ${fetchCounters.updated} · parsed ${parseCounters.parsed} · failed ${parseCounters.failed} · skipped ${parseCounters.skipped}`,
    );
  } catch (e) {
    await db
      .update(sweeps)
      .set({
        status: "failed",
        error: e instanceof Error ? e.message.slice(0, 500) : String(e),
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sweeps.id, sweep.id));
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
