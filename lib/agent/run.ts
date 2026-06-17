import "server-only";
import { DEFAULT_BUDGET } from "@/lib/agent/cost";
import { agentModel } from "@/lib/agent/groq-client";
import { runLoop } from "@/lib/agent/loop";
import { getLiveRun } from "@/lib/queries/agent-runs";
import { createRun } from "@/lib/queries/agent-writes";
import { getLatestProfile } from "@/lib/queries/profile";

/**
 * Orchestration entry points used by the Server Actions. startScan creates the
 * run row, returns its id immediately, and fires the loop WITHOUT awaiting
 * (fire-and-forget server-side) so the UI can navigate to the trace and open
 * the SSE stream while the run executes. resumeScan does the same for a paused
 * or crashed run — runLoop rebuilds the conversation from persisted steps.
 */

export class ScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanError";
  }
}

/**
 * Begin a new scan. Refuses if a run is already live (running/paused) — one
 * agent at a time keeps the trace and budget reasoning simple. Returns the new
 * run id; the loop runs detached.
 */
export async function startScan(): Promise<{ runId: number }> {
  const live = await getLiveRun();
  if (live) {
    throw new ScanError(
      `A run is already ${live.status} (#${live.id}). Wait for it to finish, or cancel it first.`,
    );
  }

  const profile = await getLatestProfile();
  if (!profile) {
    throw new ScanError("Save a profile before running the agent.");
  }

  const runId = await createRun({
    profileVersion: profile.version,
    model: agentModel(),
    stepBudget: DEFAULT_BUDGET.stepBudget,
  });

  // Fire-and-forget: the loop owns its own finalization + error handling. We
  // intentionally do not await so the action returns the id at once.
  void runLoop(runId).catch(() => {
    // runLoop already finalizes "failed" internally; this guards an unexpected
    // throw before that. Nothing to surface — the caller has the id and the
    // trace/stream will show the error step.
  });

  return { runId };
}

/**
 * Resume a paused or crashed run. Refuses unless it's paused/running-stale.
 * Async by contract (mirrors startScan; callers await it) even though the loop
 * is fired detached — hence no internal await.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- reason: kept async to match startScan's signature; the loop runs fire-and-forget.
export async function resumeScan(runId: number): Promise<{ runId: number }> {
  void runLoop(runId).catch(() => {
    // Fire-and-forget: runLoop finalizes "failed" internally; the trace/stream
    // surfaces the error. Nothing to recover here — the caller has the id.
  });
  return { runId };
}
