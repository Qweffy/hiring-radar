import  { type ProfileRow } from "@/lib/queries/profile";

/** Skill depth bucket. Drives tag tone + group placement. */
export type SkillGroup = "core" | "familiar" | "learning";

/** A single parsed skill with its current bucket (the bucket cycles on click). */
export interface Skill { name: string; g: SkillGroup }

/** Remote policy as the SegmentedControl sees it (the DB enum differs). */
export type RemoteValue = "remote" | "hybrid" | "any";

/** The editable calibration state — the dirty-tracked form model. */
export interface ProfileFormState {
  rawCv: string;
  summary: string | null;
  skills: Skill[];
  targetRoles: string[];
  salary: number; // thousands, e.g. 150 → $150k
  remote: RemoteValue;
  timezone: string;
  stages: string[]; // selected stage ids (canonical), e.g. "pre-seed"
  dealbreakers: string[];
  agentInstructions: string;
}

export const SKILL_ORDER: SkillGroup[] = ["core", "familiar", "learning"];

export const TONE_OF: Record<SkillGroup, "phosphor" | "cyan" | "violet"> = {
  core: "phosphor",
  familiar: "cyan",
  learning: "violet",
};

export const GROUP_DEFS: { key: SkillGroup; label: string; color: string }[] = [
  { key: "core", label: "CORE", color: "var(--phosphor)" },
  { key: "familiar", label: "FAMILIAR", color: "var(--cyan)" },
  { key: "learning", label: "LEARNING", color: "var(--violet)" },
];

/** Company-stage options — { id stored in DB, human label shown }. */
export const STAGE_OPTIONS: { id: string; label: string }[] = [
  { id: "pre-seed", label: "Pre-seed" },
  { id: "seed", label: "Seed" },
  { id: "series-a", label: "Series A" },
  { id: "series-b", label: "Series B" },
  { id: "growth", label: "Growth" },
  { id: "public", label: "Public" },
];

export const REMOTE_OPTIONS: { value: RemoteValue; label: string }[] = [
  { value: "remote", label: "Remote only" },
  { value: "hybrid", label: "Hybrid ok" },
  { value: "any", label: "Any" },
];

const REMOTE_TO_DB: Record<RemoteValue, "remote_only" | "hybrid_ok" | "any"> = {
  remote: "remote_only",
  hybrid: "hybrid_ok",
  any: "any",
};

const DB_TO_REMOTE: Record<"remote_only" | "hybrid_ok" | "any", RemoteValue> = {
  remote_only: "remote",
  hybrid_ok: "hybrid",
  any: "any",
};

export function remoteToDb(v: RemoteValue): "remote_only" | "hybrid_ok" | "any" {
  return REMOTE_TO_DB[v];
}

/** Build the editable form model from a loaded profile row. */
export function toFormState(profile: ProfileRow): ProfileFormState {
  const skills: Skill[] = [
    ...(profile.skills?.core ?? []).map((name) => ({ name, g: "core" as const })),
    ...(profile.skills?.familiar ?? []).map((name) => ({
      name,
      g: "familiar" as const,
    })),
    ...(profile.skills?.learning ?? []).map((name) => ({
      name,
      g: "learning" as const,
    })),
  ];
  return {
    rawCv: profile.rawCv ?? "",
    summary: profile.summary,
    skills,
    targetRoles: profile.targetRoles,
    salary: profile.salaryFloor != null ? Math.round(profile.salaryFloor / 1000) : 150,
    remote: profile.remotePref ? DB_TO_REMOTE[profile.remotePref] : "remote",
    timezone: profile.timezone ?? "UTC-3",
    stages: profile.companyStages,
    dealbreakers: profile.dealbreakers,
    agentInstructions: profile.agentInstructions ?? "",
  };
}

/** Group the flat skill list back into the DB's bucketed shape. */
export function skillsToBuckets(skills: Skill[]): {
  core: string[];
  familiar: string[];
  learning: string[];
} {
  return {
    core: skills.filter((s) => s.g === "core").map((s) => s.name),
    familiar: skills.filter((s) => s.g === "familiar").map((s) => s.name),
    learning: skills.filter((s) => s.g === "learning").map((s) => s.name),
  };
}
