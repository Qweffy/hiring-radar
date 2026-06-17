import "server-only";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { APP_SETTINGS_ID, type AppSettings } from "@/lib/queries/settings";

/**
 * Write side of the single-row app settings store. A save is an idempotent
 * upsert onto the fixed id (neon-http has no transactions), so it always
 * targets the one row — seeding it if a seed-on-read never ran. The read-side
 * AppSettings type is reused here, minus the server-managed updatedAt.
 */

export type SaveAppSettingsInput = Omit<AppSettings, "updatedAt">;

/** Persist the settings, stamping updatedAt server-side. */
export async function saveAppSettings(
  input: SaveAppSettingsInput,
): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      id: APP_SETTINGS_ID,
      agentStepBudget: input.agentStepBudget,
      agentMaxUsd: input.agentMaxUsd,
      notifySweep: input.notifySweep,
      notifyAgentRun: input.notifyAgentRun,
      notifyHighMatch: input.notifyHighMatch,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        agentStepBudget: input.agentStepBudget,
        agentMaxUsd: input.agentMaxUsd,
        notifySweep: input.notifySweep,
        notifyAgentRun: input.notifyAgentRun,
        notifyHighMatch: input.notifyHighMatch,
        updatedAt: sql`now()`,
      },
    });
}
