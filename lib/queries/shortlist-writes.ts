import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shortlistEntries, shortlistNotes } from "@/db/schema";
import type { ShortlistNote, ShortlistStage } from "@/lib/queries/shortlist";

/**
 * Write-side helpers for the Shortlist pipeline view. neon-http has no
 * transactions, so each helper is a single statement keyed on the entry's
 * unique id; the UI applies the matching change optimistically and reverts on a
 * failed action result.
 */

/** Move an entry to a new pipeline stage. Bumps updatedAt so it sorts fresh. */
export async function setEntryStage(
  entryId: number,
  stage: ShortlistStage,
): Promise<void> {
  await db
    .update(shortlistEntries)
    .set({ stage, updatedAt: new Date() })
    .where(eq(shortlistEntries.id, entryId));
}

/**
 * Permanently drop an entry. Its notes cascade via the FK's onDelete:'cascade',
 * so this single delete also removes the attached notes — matching the modal
 * copy ("removes {company} and its notes").
 */
export async function deleteEntry(entryId: number): Promise<void> {
  await db.delete(shortlistEntries).where(eq(shortlistEntries.id, entryId));
}

/** Attach a free-text note to an entry and return the persisted row. */
export async function addEntryNote(
  entryId: number,
  body: string,
): Promise<ShortlistNote> {
  const rows = await db
    .insert(shortlistNotes)
    .values({ entryId, body })
    .returning({
      id: shortlistNotes.id,
      body: shortlistNotes.body,
      createdAt: shortlistNotes.createdAt,
    });

  const row = rows[0];
  if (row === undefined) {
    throw new Error("shortlist note insert returned no row");
  }
  // Touch the entry so the freshly-noted card sorts to the top.
  await db
    .update(shortlistEntries)
    .set({ updatedAt: new Date() })
    .where(eq(shortlistEntries.id, entryId));

  return { id: row.id, body: row.body, createdAt: row.createdAt };
}
