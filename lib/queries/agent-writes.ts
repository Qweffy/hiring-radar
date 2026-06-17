import "server-only";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  agentRuns,
  agentSteps,
  assessments,
  shortlistEntries,
  type AgentStepPayload,
  type AgentStepUsage,
  type AssessmentReason,
} from "@/db/schema";
import  { type AgentRunStatus, type AgentStepKind } from "@/lib/queries/agent-runs";

/**
 * Write-side DB helpers for the agent loop. Reads live in lib/queries/agent-runs
 * (and the existing profile/shortlist/assessment modules); these are the
 * mutations the loop and its tools perform. neon-http has no transactions —
 * every helper is a single statement or an idempotent upsert keyed on a unique
 * index, so a checkpoint replay never duplicates an effect
 * (docs/best-practices/agent-tool-loops.md).
 */

/** Create the run row at the start of a scan. Returns the new run id. */
export async function createRun(input: {
  profileVersion: number;
  model: string;
  stepBudget: number;
}): Promise<number> {
  const rows = await db
    .insert(agentRuns)
    .values({
      profileVersion: input.profileVersion,
      model: input.model,
      stepBudget: input.stepBudget,
      status: "running",
    })
    .returning({ id: agentRuns.id });
  const id = rows[0]?.id;
  if (id === undefined) throw new Error("agent run insert returned no row");
  return id;
}

/**
 * Append one step to the trace. idx is supplied by the caller (monotonic per
 * run); the unique index on (run_id, idx) makes a replayed append a no-op via
 * onConflictDoNothing, so resuming from a checkpoint can't double-write.
 */
export async function appendStep(input: {
  runId: number;
  idx: number;
  kind: AgentStepKind;
  payload: AgentStepPayload;
  usage?: AgentStepUsage;
}): Promise<void> {
  await db
    .insert(agentSteps)
    .values({
      runId: input.runId,
      idx: input.idx,
      kind: input.kind,
      payload: input.payload,
      usage: input.usage ?? null,
    })
    .onConflictDoNothing({
      target: [agentSteps.runId, agentSteps.idx],
    });
}

/** Accrue running totals onto the run row after a step. */
export async function updateRunProgress(input: {
  runId: number;
  stepsUsed: number;
  costUsd: number;
  picksCount: number;
}): Promise<void> {
  await db
    .update(agentRuns)
    .set({
      stepsUsed: input.stepsUsed,
      costUsd: input.costUsd,
      picksCount: input.picksCount,
    })
    .where(eq(agentRuns.id, input.runId));
}

/** Finalize the run with a terminal status (and optional error message). */
export async function finalizeRun(input: {
  runId: number;
  status: Extract<
    AgentRunStatus,
    "completed" | "failed" | "cancelled"
  >;
  error?: string;
}): Promise<void> {
  await db
    .update(agentRuns)
    .set({
      status: input.status,
      error: input.error ?? null,
      finishedAt: new Date(),
    })
    .where(eq(agentRuns.id, input.runId));
}

/** Set a non-terminal status (paused / resumed-running). */
export async function setRunStatus(
  runId: number,
  status: Extract<AgentRunStatus, "running" | "paused">,
): Promise<void> {
  await db
    .update(agentRuns)
    .set({ status })
    .where(eq(agentRuns.id, runId));
}

/** The current status of a run — the loop polls this between steps. */
export async function getRunStatus(
  runId: number,
): Promise<AgentRunStatus | null> {
  const rows = await db
    .select({ status: agentRuns.status })
    .from(agentRuns)
    .where(eq(agentRuns.id, runId))
    .limit(1);
  return rows[0]?.status ?? null;
}

export interface SaveFindingResult {
  shortlisted: boolean;
  /** True if this posting was newly added to the shortlist (not already there). */
  newPick: boolean;
}

/**
 * Persist the agent's verdict for a posting. Always upserts the assessment
 * (unique on postingId — latest verdict wins). On 'shortlist', also upserts a
 * shortlist entry sourced to the agent + run. Both keyed on unique indexes, so
 * a replay is idempotent. Returns whether a NEW shortlist pick was created, so
 * the loop can keep picksCount accurate without recounting.
 */
export async function saveFinding(input: {
  runId: number;
  postingId: number;
  score: number;
  reasons: AssessmentReason[];
  decision: "shortlist" | "dismiss";
}): Promise<SaveFindingResult> {
  await db
    .insert(assessments)
    .values({
      postingId: input.postingId,
      runId: input.runId,
      score: input.score,
      reasons: input.reasons,
    })
    .onConflictDoUpdate({
      target: assessments.postingId,
      set: {
        runId: input.runId,
        score: input.score,
        reasons: input.reasons,
        createdAt: sql`now()`,
      },
    });

  if (input.decision !== "shortlist") {
    return { shortlisted: false, newPick: false };
  }

  const inserted = await db
    .insert(shortlistEntries)
    .values({
      postingId: input.postingId,
      source: "agent",
      runId: input.runId,
    })
    .onConflictDoNothing({ target: shortlistEntries.postingId })
    .returning({ id: shortlistEntries.id });

  return { shortlisted: true, newPick: inserted.length > 0 };
}
