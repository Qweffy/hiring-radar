import "server-only";
import { count, desc } from "drizzle-orm";
import { db } from "@/db";
import { profiles, type ProfileSkills } from "@/db/schema";

export type ProfileRow = {
  id: number;
  version: number;
  rawCv: string | null;
  summary: string | null;
  skills: ProfileSkills | null;
  targetRoles: string[];
  salaryFloor: number | null;
  remotePref: "remote_only" | "hybrid_ok" | "any" | null;
  timezone: string | null;
  companyStages: string[];
  dealbreakers: string[];
  agentInstructions: string | null;
  createdAt: Date;
};

const PROFILE_COLUMNS = {
  id: profiles.id,
  version: profiles.version,
  rawCv: profiles.rawCv,
  summary: profiles.summary,
  skills: profiles.skills,
  targetRoles: profiles.targetRoles,
  salaryFloor: profiles.salaryFloor,
  remotePref: profiles.remotePref,
  timezone: profiles.timezone,
  companyStages: profiles.companyStages,
  dealbreakers: profiles.dealbreakers,
  agentInstructions: profiles.agentInstructions,
  createdAt: profiles.createdAt,
} as const;

function toProfileRow(r: {
  id: number;
  version: number;
  rawCv: string | null;
  summary: string | null;
  skills: ProfileSkills | null;
  targetRoles: string[] | null;
  salaryFloor: number | null;
  remotePref: "remote_only" | "hybrid_ok" | "any" | null;
  timezone: string | null;
  companyStages: string[] | null;
  dealbreakers: string[] | null;
  agentInstructions: string | null;
  createdAt: Date;
}): ProfileRow {
  return {
    id: r.id,
    version: r.version,
    rawCv: r.rawCv,
    summary: r.summary,
    skills: r.skills,
    targetRoles: r.targetRoles ?? [],
    salaryFloor: r.salaryFloor,
    remotePref: r.remotePref,
    timezone: r.timezone,
    companyStages: r.companyStages ?? [],
    dealbreakers: r.dealbreakers ?? [],
    agentInstructions: r.agentInstructions,
    createdAt: r.createdAt,
  };
}

/**
 * The current profile — the highest version. Profiles are versioned (a save
 * inserts version+1), so "latest" is `order by version desc limit 1`. Returns
 * null before the profile is first seeded.
 */
export async function getLatestProfile(): Promise<ProfileRow | null> {
  const rows = await db
    .select(PROFILE_COLUMNS)
    .from(profiles)
    .orderBy(desc(profiles.version))
    .limit(1);
  const r = rows[0];
  return r ? toProfileRow(r) : null;
}

/** Total number of saved profile versions — drives the history affordance. */
export async function getProfileHistoryCount(): Promise<number> {
  const rows = await db.select({ n: count() }).from(profiles);
  return rows[0]?.n ?? 0;
}
