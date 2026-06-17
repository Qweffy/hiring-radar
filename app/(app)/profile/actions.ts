"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, runAction, type ActionResult } from "@/lib/result";
import { parseOrThrow } from "@/lib/validation";
import { parseCvSkills } from "@/lib/llm/parse-cv";
import { insertProfileVersion } from "@/lib/queries/profile-writes";
import { startScan, ScanError } from "@/lib/agent/run";
import type { CvSkills } from "@/lib/validation";

/**
 * Server Actions for the calibration screen. parseCv runs the CV through Groq
 * and returns depth-bucketed skills (zod-validated — never trusting the model).
 * saveProfile inserts a new profile version, then best-effort kicks off a fresh
 * agent run against the new calibration. A re-run failure NEVER fails the save:
 * the version is already persisted, so we report success and surface the run id
 * only when the scan actually started.
 */

const MAX_CV_CHARS = 8000;

const cvInputSchema = z.object({
  cv: z.string().trim().min(20, "Paste a bit more CV text to parse.").max(MAX_CV_CHARS),
});

/** Parse pasted CV text into core/familiar/learning skills + a summary. */
export async function parseCv(
  input: unknown,
): Promise<ActionResult<CvSkills>> {
  return runAction("Couldn't parse the CV — paste the text instead.", async () => {
    const { cv } = parseOrThrow(cvInputSchema, input);
    try {
      return await parseCvSkills(cv);
    } catch {
      // Degrade to manual paste — surface a user-safe message, the form keeps
      // the typed text so nothing is lost.
      throw new ActionError("Couldn't parse the CV — paste the text instead.");
    }
  });
}

const REMOTE_VALUES = ["remote_only", "hybrid_ok", "any"] as const;

const skillListSchema = z.array(z.string().trim().min(1).max(40)).max(48);

const saveProfileSchema = z.object({
  rawCv: z.string().trim().max(MAX_CV_CHARS).nullable(),
  summary: z.string().trim().max(600).nullable(),
  skills: z.object({
    core: skillListSchema,
    familiar: skillListSchema,
    learning: skillListSchema,
  }),
  targetRoles: z.array(z.string().trim().min(1).max(80)).max(12),
  salaryFloor: z.number().int().min(0).max(2_000_000).nullable(),
  remotePref: z.enum(REMOTE_VALUES),
  timezone: z.string().trim().max(40).nullable(),
  companyStages: z.array(z.string().trim().min(1).max(40)).max(12),
  dealbreakers: z.array(z.string().trim().min(1).max(80)).max(12),
  agentInstructions: z.string().trim().max(2000).nullable(),
});

export type SaveProfileResult = {
  version: number;
  /** Set only when the post-save agent run actually started. */
  runId: number | null;
  /** Human-readable note when the re-run could not start (save still succeeded). */
  rerunNote: string | null;
};

/**
 * Persist the calibration as a new profile version, then kick off a fresh agent
 * run against it. The save is the contract; the re-run is best-effort.
 */
export async function saveProfile(
  input: unknown,
): Promise<ActionResult<SaveProfileResult>> {
  return runAction("Couldn't save your profile — your edits are still here.", async () => {
    const data = parseOrThrow(saveProfileSchema, input);

    const { version } = await insertProfileVersion(data);
    revalidatePath("/profile");

    // Best-effort re-run: a live run, missing config, or a scan error must not
    // undo a successful save.
    try {
      const { runId } = await startScan();
      revalidatePath("/agent");
      return { version, runId, rerunNote: null };
    } catch (e) {
      const rerunNote =
        e instanceof ScanError
          ? e.message
          : "Saved — the agent re-run couldn't start.";
      return { version, runId: null, rerunNote };
    }
  });
}
