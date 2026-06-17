import "server-only";
import type { AgentRunSummary } from "@/lib/queries/agent-runs";
import type { HistoryRow } from "@/components/agent-run/history-card";
import { relativeTime, statusBadge, usd } from "@/components/agent-run/run-format";

/**
 * Build the run-history rows for the status panel from run summaries, excluding
 * the run currently on screen. The summary line mirrors the design's
 * "#23 · 5 picks · $0.43" idiom (completed) and falls back to a status-aware
 * line for non-completed runs.
 */
export function buildHistoryRows(
  runs: AgentRunSummary[],
  currentRunId: number,
  nowMs: number,
): HistoryRow[] {
  return runs
    .filter((r) => r.id !== currentRunId)
    .slice(0, 6)
    .map((r) => ({
      runId: r.id,
      badge: statusBadge(r.status),
      summary: summaryLine(r),
      when: relativeTime(r.startedAt, nowMs),
    }));
}

function summaryLine(run: AgentRunSummary): string {
  const picks = `${run.picksCount} pick${run.picksCount === 1 ? "" : "s"}`;
  switch (run.status) {
    case "completed":
      return `#${run.id} · ${picks} · ${usd(run.costUsd)}`;
    case "failed":
      return `#${run.id} · failed · ${picks}`;
    case "cancelled":
      return `#${run.id} · cancelled · ${picks}`;
    case "paused":
      return `#${run.id} · paused · ${picks}`;
    case "running":
      return `#${run.id} · running · ${picks}`;
  }
}
