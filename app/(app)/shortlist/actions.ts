"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { startScan, ScanError } from "@/lib/agent/run";
import  { type ShortlistNote } from "@/lib/queries/shortlist";
import {
  addEntryNote,
  deleteEntry,
  setEntryStage,
} from "@/lib/queries/shortlist-writes";
import { ActionError, runAction, type ActionResult } from "@/lib/result";

/**
 * Server Actions for the Shortlist. Every external input is Zod-validated before
 * a DB write (the actions are reachable by direct POST, not only via the UI).
 * Stage and note mutations follow the runAction / ActionError pattern and
 * revalidate /shortlist so a server re-render reconciles the optimistic UI.
 */

const entryIdSchema = z.coerce.number().int().positive();

const stageSchema = z.enum([
  "new",
  "applied",
  "interviewing",
  "offer",
  "archived",
]);

const noteBodySchema = z.string().trim().min(1).max(2000);

/** Move a shortlist entry to a new pipeline stage (optimistic; reverts on err). */
export async function moveStage(
  rawEntryId: number,
  rawStage: string,
): Promise<ActionResult<{ entryId: number; stage: string }>> {
  return runAction("Couldn't update stage — try again.", async () => {
    const entryId = entryIdSchema.parse(rawEntryId);
    const stage = stageSchema.parse(rawStage);
    await setEntryStage(entryId, stage);
    revalidatePath("/shortlist");
    return { entryId, stage };
  });
}

/** Permanently remove an entry and its notes (gated by the confirm modal). */
export async function removeEntry(
  rawEntryId: number,
): Promise<ActionResult<{ removed: true }>> {
  return runAction("Couldn't remove the role — try again.", async () => {
    const entryId = entryIdSchema.parse(rawEntryId);
    await deleteEntry(entryId);
    revalidatePath("/shortlist");
    return { removed: true as const };
  });
}

/** Attach a note to an entry, returning the persisted row for the optimistic UI. */
export async function addNote(
  rawEntryId: number,
  rawBody: string,
): Promise<ActionResult<{ note: ShortlistNote }>> {
  return runAction("Couldn't save the note — try again.", async () => {
    const entryId = entryIdSchema.parse(rawEntryId);
    const parsed = noteBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ActionError("A note can't be empty.");
    }
    const note = await addEntryNote(entryId, parsed.data);
    revalidatePath("/shortlist");
    return { note };
  });
}

/**
 * Kick off an agent scan from the Shortlist header / empty state. Returns the
 * new run id so the client can navigate to /agent/{runId} and watch the trace.
 * ScanError (already-live, no-profile) surfaces verbatim via ActionError.
 */
export async function runAgentScan(): Promise<
  ActionResult<{ runId: number }>
> {
  return runAction("Couldn't start the agent — try again.", async () => {
    try {
      const { runId } = await startScan();
      revalidatePath("/agent");
      return { runId };
    } catch (e) {
      if (e instanceof ScanError) throw new ActionError(e.message);
      throw e;
    }
  });
}
