// Seeds the single-user profile v1 (Nico). Versioned: this only inserts when no
// profile exists yet — a later save bumps the version via the app, not here.
// Run with `npm run seed:profile` (tsx, like the ingest/embed CLIs).
import "@/scripts/env"; // FIRST — loads .env.local before @/db reads DATABASE_URL.
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { profiles, type ProfileSkills } from "@/db/schema";

const SKILLS: ProfileSkills = {
  core: ["TypeScript", "React", "React Native", "Next.js", "Node.js"],
  familiar: ["Flutter", "PostgreSQL", "AWS", "GraphQL", "Drizzle"],
  learning: ["ML", "fine-tuning", "pgvector"],
};

const PROFILE_V1 = {
  version: 1,
  rawCv: null,
  summary:
    "Senior product engineer (6+ yrs), TypeScript/React Native/Next.js core, ships AI-assisted features end-to-end. Remote-only from Buenos Aires (UTC-3). Targets senior IC / founding roles with real LLM surface area.",
  skills: SKILLS,
  targetRoles: ["Senior Product Engineer", "Founding Engineer", "AI Engineer"],
  salaryFloor: 150000,
  remotePref: "remote_only" as const,
  timezone: "UTC-3",
  companyStages: ["pre-seed", "seed", "series-a", "series-b"],
  dealbreakers: [] as string[],
  agentInstructions:
    "Prefer product-minded startups with real LLM/AI surface area; weight AI-native and founding/early roles higher; remote-only with US/EU overlap from Buenos Aires.",
};

async function main(): Promise<void> {
  const existing = await db
    .select({ version: profiles.version })
    .from(profiles)
    .orderBy(desc(profiles.version))
    .limit(1);

  if (existing.length > 0) {
    process.stdout.write(
      `profile already seeded — latest version ${existing[0]?.version ?? "unknown"}; skipping.\n`,
    );
    return;
  }

  const inserted = await db
    .insert(profiles)
    .values(PROFILE_V1)
    .returning({ id: profiles.id, version: profiles.version });

  const row = inserted[0];
  if (!row) {
    throw new Error("profile insert returned no row");
  }
  process.stdout.write(
    `seeded profile id=${row.id} version=${row.version}.\n`,
  );
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exit(1);
});
