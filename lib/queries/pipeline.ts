import "server-only";
import { desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { deadLetters, postingEmbeddings, sweeps } from "@/db/schema";
import { EMBEDDING_MODEL } from "@/lib/embeddings";

/* ------------------------------------------------------------------ */
/* Sweeps — recent runs with counters/status/trigger/timing            */
/* ------------------------------------------------------------------ */

export interface SweepRow {
  id: number;
  threadId: number;
  month: string;
  trigger: "manual" | "cron" | "backfill";
  status: "running" | "completed" | "failed" | "partial";
  fetchedCount: number;
  newCount: number;
  updatedCount: number;
  parsedCount: number;
  failedCount: number;
  skippedCount: number;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

const DEFAULT_SWEEP_LIMIT = 20;

/** Recent sweeps, newest-first — drives the Pipeline screen's run history. */
export async function getSweeps(limit = DEFAULT_SWEEP_LIMIT): Promise<SweepRow[]> {
  return db
    .select({
      id: sweeps.id,
      threadId: sweeps.threadId,
      month: sweeps.month,
      trigger: sweeps.trigger,
      status: sweeps.status,
      fetchedCount: sweeps.fetchedCount,
      newCount: sweeps.newCount,
      updatedCount: sweeps.updatedCount,
      parsedCount: sweeps.parsedCount,
      failedCount: sweeps.failedCount,
      skippedCount: sweeps.skippedCount,
      error: sweeps.error,
      startedAt: sweeps.startedAt,
      finishedAt: sweeps.finishedAt,
    })
    .from(sweeps)
    .orderBy(desc(sweeps.id))
    .limit(limit);
}

export interface AvailableMonth {
  month: string;
  threadId: number;
}

/**
 * Distinct months we've swept, with the latest thread id per month — drives the
 * Pipeline backfill picker. DISTINCT ON month keeps the newest sweep's thread.
 */
export async function getAvailableMonths(): Promise<AvailableMonth[]> {
  return db
    .selectDistinctOn([sweeps.month], {
      month: sweeps.month,
      threadId: sweeps.threadId,
    })
    .from(sweeps)
    .orderBy(sweeps.month, desc(sweeps.id));
}

/* ------------------------------------------------------------------ */
/* Dead letters — rows + total count                                   */
/* ------------------------------------------------------------------ */

export interface DeadLetterRow {
  id: number;
  stage: "fetch" | "parse" | "embed";
  postingId: number | null;
  hnId: number | null;
  error: string;
  createdAt: Date;
}

export interface DeadLettersResult {
  rows: DeadLetterRow[];
  /** Total count across all dead letters, independent of the row limit. */
  count: number;
}

const DEFAULT_DEAD_LETTER_LIMIT = 50;

/** Recent dead letters + the full count (so the UI can show "showing N of M"). */
export async function getDeadLetters(
  limit = DEFAULT_DEAD_LETTER_LIMIT,
): Promise<DeadLettersResult> {
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: deadLetters.id,
        stage: deadLetters.stage,
        postingId: deadLetters.postingId,
        hnId: deadLetters.hnId,
        error: deadLetters.error,
        createdAt: deadLetters.createdAt,
      })
      .from(deadLetters)
      .orderBy(desc(deadLetters.id))
      .limit(limit),
    db.select({ count: sql<number>`count(*)::int` }).from(deadLetters),
  ]);

  return { rows, count: totals[0]?.count ?? 0 };
}

/* ------------------------------------------------------------------ */
/* Event log — DERIVED feed, not a separate events table               */
/* ------------------------------------------------------------------ */

export type PipelineEventKind =
  | "completed"
  | "failed"
  | "partial"
  | "running"
  | "dead-letter";

export interface PipelineEvent {
  /** Stable React key, namespaced by source so sweep/DL ids never collide. */
  id: string;
  /** UTC ISO timestamp the line is sorted by. */
  at: string;
  text: string;
  badge: string | null;
  kind: PipelineEventKind;
}

function hhmmUtc(at: Date): string {
  const hh = String(at.getUTCHours()).padStart(2, "0");
  const mm = String(at.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function sweepEvent(s: SweepRow): PipelineEvent {
  const at = s.finishedAt ?? s.startedAt;
  const base = { id: `sweep-${s.id}`, at: at.toISOString() };
  switch (s.status) {
    case "completed":
      return {
        ...base,
        text: `Sweep #${s.id} completed — ${s.newCount} new, ${s.updatedCount} updated (${s.trigger}).`,
        badge: "COMPLETED",
        kind: "completed",
      };
    case "partial":
      return {
        ...base,
        text: `Sweep #${s.id} degraded — ${s.fetchedCount} fetched, ${s.failedCount} failed.`,
        badge: "PARTIAL",
        kind: "partial",
      };
    case "failed":
      return {
        ...base,
        text: `Sweep #${s.id} failed — ${s.error ?? "pipeline error"}.`,
        badge: "FAILED",
        kind: "failed",
      };
    case "running":
      return {
        ...base,
        text: `Sweep #${s.id} running — fetching thread ${s.threadId}.`,
        badge: "RUNNING",
        kind: "running",
      };
  }
}

function deadLetterEvent(d: DeadLetterRow): PipelineEvent {
  const ref = d.hnId !== null ? `hn-${d.hnId}` : d.postingId !== null ? `posting-${d.postingId}` : "unknown";
  return {
    id: `dead-letter-${d.id}`,
    at: d.createdAt.toISOString(),
    text: `Dead letter (${d.stage}) — ${ref}: ${d.error.slice(0, 120)}`,
    badge: "DEAD LETTER",
    kind: "dead-letter",
  };
}

/**
 * A unified, time-ordered event log for the Pipeline screen. This is a DERIVED
 * feed synthesised from the `sweeps` and `dead_letters` tables — there is NO
 * separate `events` table. Each sweep contributes one line and each dead letter
 * contributes one, merged and sorted newest-first. Mirrors the dashboard signal
 * feed (lib/queries/dashboard.ts) but spans both pipeline sources.
 */
export async function getEventLog(limit = 30): Promise<PipelineEvent[]> {
  const [sweepRows, dl] = await Promise.all([
    getSweeps(limit),
    getDeadLetters(limit),
  ]);

  const events: PipelineEvent[] = [
    ...sweepRows.map(sweepEvent),
    ...dl.rows.map(deadLetterEvent),
  ];

  events.sort((a, b) => b.at.localeCompare(a.at));
  return events.slice(0, limit);
}

/** Convenience formatter for UI rows that want HH:MM instead of an ISO string. */
export function eventTime(event: PipelineEvent): string {
  return hhmmUtc(new Date(event.at));
}

/* ------------------------------------------------------------------ */
/* Pipeline summary — drives the status strip at the top of the screen */
/* ------------------------------------------------------------------ */

export type PipelineHealth = "healthy" | "degraded" | "syncing" | "idle";

export interface PipelineSummary {
  /** Overall system health, derived from the latest sweep's status. */
  health: PipelineHealth;
  /** "HH:MM UTC" of the latest sweep, or null when none has run. */
  lastSweepTime: string | null;
  /** Whether the latest sweep finished cleanly (drives the ✓/✗ glyph). */
  lastSweepOk: boolean;
  /** Pre-formatted "DD MON HH:MM" of the next scheduled cron, in UTC. */
  nextSweep: string;
  /** Count of rows in posting_embeddings — the live index size. */
  indexVectors: number;
  /** Embedding model id (e.g. "MongoDB/mdbr-leaf-ir"). */
  embedModel: string;
  /** Embedding vector dimensionality, surfaced as the model "version" tag. */
  embedDims: number;
  /**
   * Seconds the latest sweep has been running, captured at request time. Null
   * unless the latest sweep is RUNNING. Computed here (server-side) so the page
   * component never calls an impure clock during render.
   */
  runningElapsedSeconds: number | null;
}

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

/** "DD MON HH:MM" in UTC, e.g. "01 JUL 06:00". */
function formatSweepInstant(at: Date): string {
  const dd = String(at.getUTCDate()).padStart(2, "0");
  const mon = MONTH_ABBR[at.getUTCMonth()] ?? "—";
  const hh = String(at.getUTCHours()).padStart(2, "0");
  const mm = String(at.getUTCMinutes()).padStart(2, "0");
  return `${dd} ${mon} ${hh}:${mm}`;
}

/**
 * The cron `TZ=UTC 0 *​/6 1-3 * *` fires at 00/06/12/18:00 UTC on days 1-3.
 * Compute the next fire instant relative to `from` so the strip can show a real
 * "Next" readout instead of a hard-coded string.
 */
function nextCronInstant(from: Date): Date {
  const candidate = new Date(from.getTime());
  candidate.setUTCMinutes(0, 0, 0);
  // Advance to the next 6-hour boundary strictly after `from`.
  candidate.setUTCHours(candidate.getUTCHours() + 1);
  while (candidate.getUTCHours() % 6 !== 0) {
    candidate.setUTCHours(candidate.getUTCHours() + 1);
  }
  // Skip forward until we land on an active day (1-3 of the month).
  while (candidate.getUTCDate() > 3) {
    candidate.setUTCMonth(candidate.getUTCMonth() + 1, 1);
    candidate.setUTCHours(0, 0, 0, 0);
  }
  return candidate;
}

function summaryHealth(status: SweepRow["status"] | null): PipelineHealth {
  if (status === null) return "idle";
  switch (status) {
    case "failed":
      return "degraded";
    case "partial":
      return "degraded";
    case "running":
      return "syncing";
    default:
      return "healthy";
  }
}

/**
 * Top-of-screen status strip data: latest-sweep health + timing, next scheduled
 * cron, the live index vector count, and the embedding model identity. The
 * vector count is a `count(*)` over posting_embeddings (M2 HNSW index).
 */
export async function getPipelineSummary(
  now: Date = new Date(),
): Promise<PipelineSummary> {
  const [latest, vectorRows] = await Promise.all([
    getSweeps(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(postingEmbeddings),
  ]);

  const sweep = latest[0] ?? null;
  const lastAt = sweep ? sweep.finishedAt ?? sweep.startedAt : null;
  const hh = lastAt ? String(lastAt.getUTCHours()).padStart(2, "0") : null;
  const mm = lastAt ? String(lastAt.getUTCMinutes()).padStart(2, "0") : null;

  const runningElapsedSeconds =
    sweep?.status === "running"
      ? Math.max(0, Math.round((now.getTime() - sweep.startedAt.getTime()) / 1000))
      : null;

  return {
    health: summaryHealth(sweep?.status ?? null),
    lastSweepTime: hh !== null && mm !== null ? `${hh}:${mm} UTC` : null,
    lastSweepOk: sweep ? sweep.status !== "failed" : true,
    nextSweep: formatSweepInstant(nextCronInstant(now)),
    indexVectors: vectorRows[0]?.count ?? 0,
    embedModel: EMBEDDING_MODEL,
    embedDims: 384,
    runningElapsedSeconds,
  };
}
