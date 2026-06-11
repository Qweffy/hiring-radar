import "server-only";
import { and, desc, gt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings, sweeps } from "@/db/schema";

export type SweepSummary = {
  id: number;
  month: string;
  status: "running" | "completed" | "failed" | "partial";
  finishedAt: Date | null;
  startedAt: Date;
  fetchedCount: number;
  newCount: number;
};

export async function getLatestSweep(): Promise<SweepSummary | null> {
  const rows = await db
    .select({
      id: sweeps.id,
      month: sweeps.month,
      status: sweeps.status,
      finishedAt: sweeps.finishedAt,
      startedAt: sweeps.startedAt,
      fetchedCount: sweeps.fetchedCount,
      newCount: sweeps.newCount,
    })
    .from(sweeps)
    .orderBy(desc(sweeps.id))
    .limit(1);
  return rows[0] ?? null;
}

/** Latest sweep that finished a fetch — drives the NEW badge. */
export async function getLatestCompletedSweepId(): Promise<number | null> {
  const rows = await db
    .select({ id: sweeps.id })
    .from(sweeps)
    .where(ne(sweeps.status, "failed"))
    .orderBy(desc(sweeps.id))
    .limit(1);
  return rows[0]?.id ?? null;
}

/**
 * Latest sweep that actually ingested postings (newCount > 0) — the reference
 * for "new this month" and the per-row NEW badge. A `--skip-fetch` reparse sweep
 * has newCount 0 and must NOT reset the NEW reference, otherwise "new" reads 0
 * the moment a reparse runs. Returns null until the first real ingest.
 */
export async function getLatestIngestSweepId(): Promise<number | null> {
  const rows = await db
    .select({ id: sweeps.id })
    .from(sweeps)
    .where(and(ne(sweeps.status, "failed"), gt(sweeps.newCount, 0)))
    .orderBy(desc(sweeps.id))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function getAvailableMonths(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ month: postings.month })
    .from(postings)
    .orderBy(sql`month desc`);
  return rows.map((r) => r.month);
}
