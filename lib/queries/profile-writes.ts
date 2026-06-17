import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { profiles, type ProfileSkills } from "@/db/schema";

/**
 * Write-side helpers for the versioned single-user profile. A save NEVER updates
 * in place — it inserts a new row with version = max(version)+1, so the latest
 * profile is the highest version and past agent runs stay reproducible against
 * the version they ran on. neon-http has no transactions; the next-version read
 * + insert is a single-writer path (one user) and the unique index on `version`
 * is the backstop against an accidental duplicate.
 */

export type SaveProfileInput = {
  rawCv: string | null;
  summary: string | null;
  skills: ProfileSkills;
  targetRoles: string[];
  salaryFloor: number | null;
  remotePref: "remote_only" | "hybrid_ok" | "any";
  timezone: string | null;
  companyStages: string[];
  dealbreakers: string[];
  agentInstructions: string | null;
};

/** Insert a new profile version. Returns the new row's id and version. */
export async function insertProfileVersion(
  input: SaveProfileInput,
): Promise<{ id: number; version: number }> {
  const latest = await db
    .select({ version: profiles.version })
    .from(profiles)
    .orderBy(desc(profiles.version))
    .limit(1);
  const nextVersion = (latest[0]?.version ?? 0) + 1;

  const rows = await db
    .insert(profiles)
    .values({ version: nextVersion, ...input })
    .returning({ id: profiles.id, version: profiles.version });

  const row = rows[0];
  if (!row) throw new Error("profile insert returned no row");
  return row;
}
