// Shared fetch + diff core for both the manual CLI (scripts/ingest.ts) and the
// Inngest runSweep function. No "server-only" guard: the tsx CLI imports this.
// Pure DB/HN I/O — no logging here so each caller owns its own progress output.
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { postings } from "@/db/schema";
import { contentHash } from "@/lib/hash";
import { fetchThread } from "@/lib/hn/algolia";
import { hnHtmlToText } from "@/lib/hn/html-to-text";

export interface DiffCounters { fetched: number; added: number; updated: number }

/** One posting that changed in this sweep and now needs (re)parse + (re)embed. */
export interface ChangedPosting {
  id: number;
  hnId: number;
  change: "new" | "updated";
}

export interface FetchDiffResult {
  counters: DiffCounters;
  /** Postings to fan out for parse/embed — new inserts + content-changed edits. */
  changed: ChangedPosting[];
  /** hnIds that vanished from the tree and were marked deleted. */
  deleted: number[];
}

/**
 * Fetch the live thread, diff it against stored postings, and apply the writes:
 * insert new postings, refresh edited ones (gated on contentHash), bump
 * lastSeenAt, and mark absent postings deleted. Returns the set of changed
 * postings so the caller can drive parsing — the CLI parses inline, the Inngest
 * path fans out one event per posting. Re-runnable: upserts keyed on hnId.
 */
export async function fetchAndDiff(
  sweepId: number,
  threadId: number,
  month: string,
): Promise<FetchDiffResult> {
  const { postings: live } = await fetchThread(threadId);

  const stored = await db
    .select({
      id: postings.id,
      hnId: postings.hnId,
      contentHash: postings.contentHash,
    })
    .from(postings)
    .where(eq(postings.threadId, threadId));
  const storedByHnId = new Map(
    stored.map((r) => [r.hnId, { id: r.id, contentHash: r.contentHash }]),
  );

  const seenIds: number[] = [];
  const toInsert: (typeof postings.$inferInsert)[] = [];
  const updated: number[] = [];

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
    } else if (existing.contentHash !== hash) {
      // Edited posting — refresh content and re-open it for parse/embed.
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
      updated.push(c.id);
    }
  }

  for (let i = 0; i < toInsert.length; i += 100) {
    await db
      .insert(postings)
      .values(toInsert.slice(i, i + 100))
      .onConflictDoNothing({ target: postings.hnId });
  }

  const deleted: number[] = [];
  if (seenIds.length > 0) {
    await db
      .update(postings)
      .set({ lastSeenAt: new Date() })
      .where(and(eq(postings.threadId, threadId), inArray(postings.hnId, seenIds)));

    // Algolia silently drops deleted comments — absent IDs are deletions.
    const seen = new Set(seenIds);
    const absent = stored.map((r) => r.hnId).filter((id) => !seen.has(id));
    if (absent.length > 0) {
      await db
        .update(postings)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(inArray(postings.hnId, absent));
      deleted.push(...absent);
    }
  }

  // Re-read the ids for freshly inserted postings (identity PK assigned by the
  // DB) so the caller can fan out by posting id, not just hnId.
  const changed: ChangedPosting[] = [];
  for (const hnId of updated) {
    const existing = storedByHnId.get(hnId);
    if (existing) changed.push({ id: existing.id, hnId, change: "updated" });
  }
  if (toInsert.length > 0) {
    const insertedIds = toInsert.map((p) => p.hnId);
    const rows = await db
      .select({ id: postings.id, hnId: postings.hnId })
      .from(postings)
      .where(
        and(eq(postings.threadId, threadId), inArray(postings.hnId, insertedIds)),
      );
    for (const r of rows) changed.push({ id: r.id, hnId: r.hnId, change: "new" });
  }

  return {
    counters: { fetched: live.length, added: toInsert.length, updated: updated.length },
    changed,
    deleted,
  };
}
