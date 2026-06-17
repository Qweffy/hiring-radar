import "server-only";
import  { type AgentRunViewProps } from "@/components/agent-run/agent-run-view";
import { buildHistoryRows } from "@/components/agent-run/build-history";
import { utcTime } from "@/components/agent-run/run-format";
import { DEFAULT_BUDGET } from "@/lib/agent/cost";
import {
  getRun,
  getRunPicks,
  listRuns,
  type AgentRunDetail,
  type AgentStepRow,
} from "@/lib/queries/agent-runs";

/**
 * Assemble everything the live Agent Run screen needs for one run: the run row,
 * its full step trace, the picks it produced, and the run-history list. Pure
 * server work; the view (a client component) takes it as plain props and wires
 * the SSE feed + actions itself.
 */

/** Count distinct postings the agent read, for the completed card's "of N scanned". */
function countScanned(steps: AgentStepRow[]): number | null {
  const read = new Set<number>();
  for (const step of steps) {
    if (step.kind !== "observation") continue;
    const payload = step.payload as { observation?: unknown };
    const obs = payload.observation;
    if (typeof obs === "object" && obs !== null && "hnId" in obs) {
      const hnId = (obs).hnId;
      if (typeof hnId === "number") read.add(hnId);
    }
  }
  return read.size > 0 ? read.size : null;
}

/** Classify why a failed run stopped — a budget cap vs. an actual fault. */
function endReason(detail: AgentRunDetail): "budget" | "error" | null {
  if (detail.status !== "failed") return null;
  if (detail.error?.startsWith("budget_exhausted")) return "budget";
  return "error";
}

/** A short, user-facing failure message for the failed card. */
function failureMessage(detail: AgentRunDetail): string | null {
  if (detail.status !== "failed") return null;
  if (detail.error && !detail.error.startsWith("budget_exhausted")) {
    return `${detail.error.slice(0, 80)} — run halted at step ${detail.stepsUsed}`;
  }
  return `Run halted at step ${detail.stepsUsed}`;
}

export async function loadRunView(
  runId: number,
  nowMs: number,
): Promise<AgentRunViewProps | null> {
  const detail = await getRun(runId);
  if (!detail) return null;

  const [picks, runs] = await Promise.all([getRunPicks(runId), listRuns(12)]);

  const elapsedEnd = detail.finishedAt ?? new Date(nowMs);
  const initialElapsedSec = Math.max(
    0,
    Math.floor((elapsedEnd.getTime() - detail.startedAt.getTime()) / 1000),
  );

  return {
    runId: detail.id,
    status: detail.status,
    endReason: endReason(detail),
    startedAtUtc: utcTime(detail.startedAt),
    initialElapsedSec,
    stepBudget: detail.stepBudget,
    stepsUsed: detail.stepsUsed,
    costUsd: detail.costUsd,
    costBudget: DEFAULT_BUDGET.maxUsd,
    model: detail.model,
    scanned: countScanned(detail.steps),
    errorMessage: failureMessage(detail),
    steps: detail.steps,
    picks,
    history: buildHistoryRows(runs, detail.id, nowMs),
  };
}
