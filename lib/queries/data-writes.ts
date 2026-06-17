import "server-only";
import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * Destructive data ops for the Settings → Data panel. Purge wipes the ingested
 * + derived corpus (postings, embeddings, sweeps, dead letters) and everything
 * the agent produced (runs, steps, assessments, shortlist). The single-user
 * profile, the app settings row, and the MCP API keys are deliberately kept —
 * "Purge all data" means the radar's collected data, not the account itself.
 *
 * One TRUNCATE … CASCADE statement, not a multi-step delete: neon-http has no
 * transactions, so a sequence of deletes could half-apply on a mid-flight
 * failure. TRUNCATE is a single atomic statement at the Postgres level and
 * RESTART IDENTITY resets the generated-always id sequences so a fresh ingest
 * starts clean. CASCADE follows the FKs (embeddings/assessments/steps/notes/
 * shortlist), so naming the roots is enough.
 */
export async function purgeAllData(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      postings,
      sweeps,
      dead_letters,
      agent_runs
    RESTART IDENTITY CASCADE
  `);
}
