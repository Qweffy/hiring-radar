import "server-only";
import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  agentRuns,
  agentSteps,
  assessments,
  postings,
  shortlistEntries,
  type AgentStepPayload,
  type AgentStepUsage,
} from "@/db/schema";

export type AgentRunStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

export type AgentStepKind =
  | "tool_call"
  | "observation"
  | "reasoning"
  | "decision"
  | "error";

export interface AgentRunSummary {
  id: number;
  profileVersion: number;
  status: AgentRunStatus;
  model: string;
  stepBudget: number;
  stepsUsed: number;
  costUsd: number;
  picksCount: number;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface AgentStepRow {
  id: number;
  runId: number;
  idx: number;
  kind: AgentStepKind;
  payload: AgentStepPayload;
  usage: AgentStepUsage | null;
  createdAt: Date;
}

export type AgentRunDetail = AgentRunSummary & {
  steps: AgentStepRow[];
};

const RUN_COLUMNS = {
  id: agentRuns.id,
  profileVersion: agentRuns.profileVersion,
  status: agentRuns.status,
  model: agentRuns.model,
  stepBudget: agentRuns.stepBudget,
  stepsUsed: agentRuns.stepsUsed,
  costUsd: agentRuns.costUsd,
  picksCount: agentRuns.picksCount,
  error: agentRuns.error,
  startedAt: agentRuns.startedAt,
  finishedAt: agentRuns.finishedAt,
} as const;

const DEFAULT_RUN_LIMIT = 20;

/** A single run with its full, idx-ordered step trace. null if no such run. */
export async function getRun(id: number): Promise<AgentRunDetail | null> {
  const [runRows, stepRows] = await Promise.all([
    db.select(RUN_COLUMNS).from(agentRuns).where(eq(agentRuns.id, id)).limit(1),
    db
      .select()
      .from(agentSteps)
      .where(eq(agentSteps.runId, id))
      .orderBy(asc(agentSteps.idx)),
  ]);
  const run = runRows[0];
  if (!run) return null;
  return { ...run, steps: stepRows };
}

/** Recent runs, newest-first — drives the Agent Run history list. */
export async function listRuns(
  limit = DEFAULT_RUN_LIMIT,
): Promise<AgentRunSummary[]> {
  return db
    .select(RUN_COLUMNS)
    .from(agentRuns)
    .orderBy(desc(agentRuns.startedAt))
    .limit(limit);
}

/** Just the run's status + finalized flag — for the SSE tail to know when to close. */
export async function getRunHead(
  id: number,
): Promise<{ status: AgentRunStatus; finishedAt: Date | null } | null> {
  const rows = await db
    .select({ status: agentRuns.status, finishedAt: agentRuns.finishedAt })
    .from(agentRuns)
    .where(eq(agentRuns.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Steps of a run with idx strictly greater than `afterIdx`, ascending. The SSE
 * route tails this in a loop, advancing afterIdx as it emits, so the UI sees
 * each persisted step the moment it lands.
 */
export async function getStepsAfter(
  runId: number,
  afterIdx: number,
): Promise<AgentStepRow[]> {
  return db
    .select()
    .from(agentSteps)
    .where(and(eq(agentSteps.runId, runId), gt(agentSteps.idx, afterIdx)))
    .orderBy(asc(agentSteps.idx));
}

/**
 * The id of the most-recently-started run, or null if none exist yet. The
 * profile footer renders `USED BY RUN #{id}` to tie a calibration version to the
 * agent run that consumed it.
 */
export async function getLatestRunId(): Promise<number | null> {
  const rows = await db
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);
  return rows[0]?.id ?? null;
}

export interface RunPick {
  hnId: number;
  company: string | null;
  role: string | null;
  score: number | null;
}

/**
 * The shortlist picks this run produced, newest-first — drives the "Picks so
 * far" panel on the live run screen. Joins each agent-sourced shortlist entry
 * for the run to its posting and latest assessment (score). Bounded; a run
 * tops out at the step budget so this never returns an unbounded set.
 */
export async function getRunPicks(runId: number): Promise<RunPick[]> {
  return db
    .select({
      hnId: postings.hnId,
      company: postings.company,
      role: postings.role,
      score: assessments.score,
    })
    .from(shortlistEntries)
    .innerJoin(postings, eq(postings.id, shortlistEntries.postingId))
    .leftJoin(assessments, eq(assessments.postingId, shortlistEntries.postingId))
    .where(eq(shortlistEntries.runId, runId))
    .orderBy(desc(shortlistEntries.addedAt));
}

const LIVE_STATUSES: AgentRunStatus[] = ["running", "paused"];

/**
 * The current in-flight run (running or paused), if any — drives the live
 * "agent is working" view and gates starting a new run. Most-recent wins.
 */
export async function getLiveRun(): Promise<AgentRunSummary | null> {
  const rows = await db
    .select(RUN_COLUMNS)
    .from(agentRuns)
    .where(inArray(agentRuns.status, LIVE_STATUSES))
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);
  return rows[0] ?? null;
}
