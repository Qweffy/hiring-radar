import "server-only";
import { desc, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  errorEvents,
  type ErrorContext,
  type ErrorSource,
} from "@/db/schema";

export interface ErrorEventRow {
  id: number;
  level: "warn" | "error" | "fatal";
  source: ErrorSource;
  message: string;
  stack: string | null;
  context: ErrorContext | null;
  path: string | null;
  digest: string | null;
  createdAt: Date;
}

const DEFAULT_LIMIT = 100;

/** Recent error events, newest-first — drives the admin Diagnostics screen. */
export async function getRecentErrors(limit = DEFAULT_LIMIT): Promise<ErrorEventRow[]> {
  return db
    .select()
    .from(errorEvents)
    .orderBy(desc(errorEvents.createdAt))
    .limit(limit);
}

export interface ErrorSummary {
  total24h: number;
  byLevel: { level: ErrorEventRow["level"]; count: number }[];
  bySource: { source: ErrorSource; count: number }[];
}

const SINCE_24H = sql`now() - interval '24 hours'`;

/** Last-24h rollups for the Diagnostics summary strip. */
export async function getErrorSummary(): Promise<ErrorSummary> {
  const [totals, byLevel, bySource] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(errorEvents)
      .where(sql`${errorEvents.createdAt} >= ${SINCE_24H}`),
    db
      .select({ level: errorEvents.level, count: sql<number>`count(*)::int` })
      .from(errorEvents)
      .where(sql`${errorEvents.createdAt} >= ${SINCE_24H}`)
      .groupBy(errorEvents.level),
    db
      .select({ source: errorEvents.source, count: sql<number>`count(*)::int` })
      .from(errorEvents)
      .where(sql`${errorEvents.createdAt} >= ${SINCE_24H}`)
      .groupBy(errorEvents.source)
      .orderBy(desc(sql`count(*)`)),
  ]);

  return {
    total24h: totals[0]?.n ?? 0,
    byLevel,
    bySource,
  };
}
