import  {
  type DeadLetterRow,
  type PipelineSummary,
  type SweepRow,
} from "@/lib/queries/pipeline";

/** Status enum the StatusBadge expects, derived from a sweep's DB status. */
export type SweepBadgeStatus =
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL";

export type SweepTrigger = "CRON" | "MANUAL" | "BACKFILL";

/** A single derived step in the expanded sweep breakdown. */
export interface SweepStep {
  name: string;
  /** Count surfaced for this stage (we don't store per-step durations). */
  count: number;
  /** Short note: "ok", "N failed", etc. */
  note: string;
  /** Stage hit a non-clean outcome → amber accent. */
  warn: boolean;
}

/** Fully-derived sweep row the table renders — counts, timing, steps, status. */
export interface SweepView {
  id: number;
  threadId: number;
  /** "JUN 2026" — display month derived from the "YYYY-MM" field. */
  monthLabel: string;
  trigger: SweepTrigger;
  /** "HH:MM UTC" the sweep started. */
  started: string;
  /** "Nm Ss" total wall-clock, or "—" while still running. */
  dur: string;
  newCount: number;
  reembCount: number;
  failedCount: number;
  fetchedCount: number;
  changedCount: number;
  status: SweepBadgeStatus;
  steps: SweepStep[];
}

/** Dead-letter row shaped for the panel (uppercased stage badge + ref id). */
export interface DeadLetterView {
  id: number;
  /** Stable display ref, e.g. "hn-48359112". */
  ref: string;
  /** Uppercased failing stage: FETCH | PARSE | EMBED. */
  step: string;
  error: string;
}

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const name = MONTH_ABBR[(m ?? 1) - 1] ?? "—";
  return `${name} ${y ?? ""}`;
}

function hhmmUtc(at: Date): string {
  const hh = String(at.getUTCHours()).padStart(2, "0");
  const mm = String(at.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} UTC`;
}

/** "3m 24s" total wall-clock between started/finished, or "—" if unfinished. */
function duration(started: Date, finished: Date | null): string {
  if (finished === null) return "—";
  const ms = Math.max(0, finished.getTime() - started.getTime());
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function badgeStatus(status: SweepRow["status"]): SweepBadgeStatus {
  switch (status) {
    case "running":
      return "RUNNING";
    case "failed":
      return "FAILED";
    case "partial":
      return "PARTIAL";
    default:
      return "COMPLETED";
  }
}

/**
 * Derive the five-stage breakdown from the sweep's stored counters. We do NOT
 * store per-step durations, so the breakdown surfaces honest COUNTS per stage
 * plus a note — never fabricated millisecond timings.
 */
function deriveSteps(s: SweepRow): SweepStep[] {
  const failed = s.failedCount;
  const reembNote = s.updatedCount > 0 ? `${s.updatedCount} re-embedded` : "ok";
  return [
    {
      name: "fetch",
      count: s.fetchedCount,
      note: `${s.fetchedCount} fetched`,
      warn: false,
    },
    {
      name: "parse",
      count: s.parsedCount,
      note: failed > 0 ? `${failed} failed` : "ok",
      warn: failed > 0,
    },
    {
      name: "diff",
      count: s.newCount + s.updatedCount,
      note: `${s.newCount} new · ${s.updatedCount} changed`,
      warn: false,
    },
    {
      name: "embed",
      count: s.newCount + s.updatedCount,
      note: reembNote,
      warn: false,
    },
    {
      name: "index",
      count: s.newCount + s.updatedCount,
      note: "ok",
      warn: false,
    },
  ];
}

export function toSweepView(s: SweepRow): SweepView {
  return {
    id: s.id,
    threadId: s.threadId,
    monthLabel: monthLabel(s.month),
    trigger: s.trigger.toUpperCase() as SweepTrigger,
    started: hhmmUtc(s.startedAt),
    dur: duration(s.startedAt, s.finishedAt),
    newCount: s.newCount,
    reembCount: s.updatedCount,
    failedCount: s.failedCount,
    fetchedCount: s.fetchedCount,
    changedCount: s.updatedCount,
    status: badgeStatus(s.status),
    steps: deriveSteps(s),
  };
}

export function toDeadLetterView(d: DeadLetterRow): DeadLetterView {
  const ref =
    d.hnId !== null
      ? `hn-${d.hnId}`
      : d.postingId !== null
        ? `posting-${d.postingId}`
        : "unknown";
  return {
    id: d.id,
    ref,
    step: d.stage.toUpperCase(),
    error: d.error,
  };
}

export type { PipelineSummary };
