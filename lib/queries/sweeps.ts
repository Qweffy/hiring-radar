import "server-only";
import { desc, ne, sql } from "drizzle-orm";
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

export async function getAvailableMonths(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ month: postings.month })
    .from(postings)
    .orderBy(sql`month desc`);
  return rows.map((r) => r.month);
}
