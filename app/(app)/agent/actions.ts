"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { resumeScan, ScanError, startScan } from "@/lib/agent/run";
import {
  finalizeRun,
  getRunStatus,
  setRunStatus,
} from "@/lib/queries/agent-writes";
import { checkLimit, clientIdentity, type LimiterName } from "@/lib/ratelimit";
import { ActionError, runAction, type ActionResult } from "@/lib/result";

/**
 * Server Actions for the matching agent. runAgentScan kicks off a run and
 * returns its id immediately (the loop executes detached server-side) so the UI
 * can navigate to /agent/{runId} and open the live SSE trace. pause/cancel/
 * resume flip the run status; the loop checks status between steps and stops on
 * cancel/pause. All follow the runAction / ActionError pattern (lib/result.ts).
 */

function toScanError(e: unknown): never {
  if (e instanceof ScanError) throw new ActionError(e.message);
  throw e;
}

/**
 * Enforce a frequency limit on an LLM-triggering action. No-ops when Upstash
 * isn't configured; otherwise throws a user-safe ActionError that reaches the
 * client verbatim (lib/result.ts) and surfaces through the existing error toast.
 */
async function enforceLimit(name: LimiterName): Promise<void> {
  const limit = await checkLimit(name, clientIdentity(await headers()));
  if (!limit.ok) {
    throw new ActionError(
      `Scanning too fast — try again in ${limit.retryAfterSeconds}s.`,
    );
  }
}

/** Start a new scan. Returns the run id to navigate to. */
export async function runAgentScan(): Promise<ActionResult<{ runId: number }>> {
  return runAction("Couldn't start the agent — try again.", async () => {
    await enforceLimit("agentScan");
    try {
      const { runId } = await startScan();
      revalidatePath("/agent");
      return { runId };
    } catch (e) {
      toScanError(e);
    }
  });
}

/** Request a pause — the loop stops after its current step and stays resumable. */
export async function pauseRun(
  runId: number,
): Promise<ActionResult<{ paused: true }>> {
  return runAction("Couldn't pause the run — try again.", async () => {
    const status = await getRunStatus(runId);
    if (status !== "running") {
      throw new ActionError(`Run #${runId} is not running (it is ${status}).`);
    }
    await setRunStatus(runId, "paused");
    revalidatePath(`/agent/${runId}`);
    return { paused: true as const };
  });
}

/** Cancel a run — terminal, not resumable. */
export async function cancelRun(
  runId: number,
): Promise<ActionResult<{ cancelled: true }>> {
  return runAction("Couldn't cancel the run — try again.", async () => {
    const status = await getRunStatus(runId);
    if (status !== "running" && status !== "paused") {
      throw new ActionError(
        `Run #${runId} can't be cancelled (it is ${status}).`,
      );
    }
    // Finalize directly: a paused run isn't in the loop, so set the terminal
    // status here. A running loop will also see "cancelled" on its next poll
    // and stop; finalizing now is idempotent (finishedAt set once).
    await finalizeRun({ runId, status: "cancelled" });
    revalidatePath(`/agent/${runId}`);
    return { cancelled: true as const };
  });
}

/** Resume a paused run — re-arms it and re-fires the detached loop. */
export async function resumeRun(
  runId: number,
): Promise<ActionResult<{ runId: number }>> {
  return runAction("Couldn't resume the run — try again.", async () => {
    await enforceLimit("agentScan");
    const status = await getRunStatus(runId);
    if (status !== "paused") {
      throw new ActionError(`Only paused runs can resume (it is ${status}).`);
    }
    await setRunStatus(runId, "running");
    await resumeScan(runId);
    revalidatePath(`/agent/${runId}`);
    return { runId };
  });
}
