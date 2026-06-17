import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { DEFAULT_BUDGET } from "@/lib/agent/cost";

/**
 * Read side of the single-row app settings store (db/schema.ts → appSettings).
 * The table holds at most one row, keyed on a fixed id; defaults mirror
 * DEFAULT_BUDGET from lib/agent/cost.ts.
 */

/** The fixed primary key of the single settings row. */
export const APP_SETTINGS_ID = 1;

export interface AppSettings {
  agentStepBudget: number;
  agentMaxUsd: number;
  notifySweep: boolean;
  notifyAgentRun: boolean;
  notifyHighMatch: boolean;
  updatedAt: Date;
}

const SETTINGS_COLUMNS = {
  agentStepBudget: appSettings.agentStepBudget,
  agentMaxUsd: appSettings.agentMaxUsd,
  notifySweep: appSettings.notifySweep,
  notifyAgentRun: appSettings.notifyAgentRun,
  notifyHighMatch: appSettings.notifyHighMatch,
  updatedAt: appSettings.updatedAt,
} as const;

/**
 * The app settings, seeding the default row on first read if migration 0004's
 * seed insert was ever skipped. The upsert is idempotent (onConflictDoNothing
 * on the fixed id), so concurrent reads under neon-http's no-transaction model
 * can't race two rows into existence. Defaults come from DEFAULT_BUDGET.
 */
export async function getAppSettings(): Promise<AppSettings> {
  const existing = await db
    .select(SETTINGS_COLUMNS)
    .from(appSettings)
    .where(eq(appSettings.id, APP_SETTINGS_ID))
    .limit(1);

  const found = existing[0];
  if (found) return found;

  const inserted = await db
    .insert(appSettings)
    .values({
      id: APP_SETTINGS_ID,
      agentStepBudget: DEFAULT_BUDGET.stepBudget,
      agentMaxUsd: DEFAULT_BUDGET.maxUsd,
    })
    .onConflictDoNothing({ target: appSettings.id })
    .returning(SETTINGS_COLUMNS);

  const seeded = inserted[0];
  if (seeded) return seeded;

  // A concurrent reader won the insert race — re-read the row it created.
  const reread = await db
    .select(SETTINGS_COLUMNS)
    .from(appSettings)
    .where(eq(appSettings.id, APP_SETTINGS_ID))
    .limit(1);

  const row = reread[0];
  if (!row) throw new Error("app_settings row missing after seed-on-read");
  return row;
}
