"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { verifySession } from "@/lib/auth";
import { findLatestHiringThread } from "@/lib/hn/algolia";
import { inngest, sweepRequested } from "@/lib/inngest/client";
import { createApiKey, revokeApiKey } from "@/lib/mcp/api-keys";
import { purgeAllData } from "@/lib/queries/data-writes";
import { getAppSettings } from "@/lib/queries/settings";
import { saveAppSettings as persistSettings } from "@/lib/queries/settings-writes";
import { ActionError, runAction, type ActionResult } from "@/lib/result";
import { parseOrThrow } from "@/lib/validation";

/**
 * Server Actions for /settings. Every action re-checks the admin session before
 * mutating — the proxy gate is optimistic and actions are reachable by direct
 * POST (Next 16 data-security guidance), exactly like the pipeline actions.
 * All boundaries are zod-validated; failures flow through runAction/ActionError
 * so a user-safe message reaches the client and anything else is logged + the
 * generic fallback returned.
 */

/** Step-budget bounds mirror the Settings RangeSlider (5–50). */
const STEP_BUDGET_MIN = 5;
const STEP_BUDGET_MAX = 50;
/** Cost cap bounds — a positive dollar amount, capped well above the default. */
const COST_CAP_MIN = 0.05;
const COST_CAP_MAX = 100;

/** Re-assert the admin session inside the action body. */
async function assertAdmin(): Promise<void> {
  if (!(await verifySession())) {
    throw new ActionError("Your admin session expired — sign in again.");
  }
}

/* ------------------------------------------------------------------ */
/* App settings (agent limits + notifications)                          */
/* ------------------------------------------------------------------ */

const saveSettingsSchema = z.object({
  agentStepBudget: z.number().int().min(STEP_BUDGET_MIN).max(STEP_BUDGET_MAX),
  agentMaxUsd: z.number().min(COST_CAP_MIN).max(COST_CAP_MAX),
  notifySweep: z.boolean(),
  notifyAgentRun: z.boolean(),
  notifyHighMatch: z.boolean(),
});

export interface SaveSettingsResult {
  agentStepBudget: number;
  agentMaxUsd: number;
}

/**
 * Persist agent limits + notification toggles in one upsert (the sticky
 * "Unsaved changes" bar saves everything atomically). Returns the persisted
 * numeric values so the client can re-baseline its dirty tracking.
 */
export async function saveAppSettings(
  input: unknown,
): Promise<ActionResult<SaveSettingsResult>> {
  return runAction("Couldn't save settings — your changes are still here.", async () => {
    await assertAdmin();
    const data = parseOrThrow(saveSettingsSchema, input);
    await persistSettings(data);
    revalidatePath("/settings");
    return { agentStepBudget: data.agentStepBudget, agentMaxUsd: data.agentMaxUsd };
  });
}

/* ------------------------------------------------------------------ */
/* Sweep schedule — "Run sweep now"                                     */
/* ------------------------------------------------------------------ */

/**
 * Trigger an immediate sweep. Discovers the current "Who is hiring?" thread and
 * emits hn/sweep.requested with trigger "manual" — the same durable event the
 * monthly cron uses, so the manual run shares runSweep's idempotent path. The
 * event id is uniquified per call so a manual re-run isn't collapsed by the
 * cron's deterministic dedup key.
 */
export async function runSweepNow(): Promise<ActionResult<{ month: string }>> {
  return runAction("Couldn't start the sweep — try again.", async () => {
    await assertAdmin();
    const thread = await findLatestHiringThread();
    if (thread === null) {
      throw new ActionError("No active 'Who is hiring?' thread found right now.");
    }

    await inngest.send({
      name: sweepRequested.name,
      id: `sweep-${String(thread.threadId)}-manual-${String(Date.now())}`,
      data: { threadId: thread.threadId, month: thread.month, trigger: "manual" },
    });

    revalidatePath("/settings");
    revalidatePath("/pipeline");
    return { month: thread.month };
  });
}

/* ------------------------------------------------------------------ */
/* MCP API keys                                                         */
/* ------------------------------------------------------------------ */

const KEY_SCOPES = ["read", "read_write"] as const;

const generateKeySchema = z.object({
  name: z.string().trim().min(1, "Give the key a name.").max(60),
  scope: z.enum(KEY_SCOPES),
});

export interface GenerateKeyResult {
  /** The raw key — surfaced ONCE in the one-time reveal, never recoverable. */
  raw: string;
  name: string;
  scope: (typeof KEY_SCOPES)[number];
}

/**
 * Mint a new MCP bearer key. Returns the raw key exactly once so the client can
 * show the one-time reveal; only the hash + prefix are persisted (see
 * lib/mcp/api-keys.ts). A single insert — neon-http has no transactions.
 */
export async function generateApiKey(
  input: unknown,
): Promise<ActionResult<GenerateKeyResult>> {
  return runAction("Couldn't generate the key — the auth service didn't respond.", async () => {
    await assertAdmin();
    const data = parseOrThrow(generateKeySchema, input);
    const created = await createApiKey({ name: data.name, scope: data.scope });
    revalidatePath("/settings");
    return { raw: created.raw, name: data.name, scope: data.scope };
  });
}

const revokeKeySchema = z.object({
  id: z.number().int().positive(),
});

/**
 * Revoke a key by id (sets revokedAt, keeps the row for the audit trail).
 * Idempotent — re-revoking a revoked key is a no-op that still reports success.
 */
export async function revokeApiKeyAction(
  input: unknown,
): Promise<ActionResult<{ revoked: boolean }>> {
  return runAction("Couldn't revoke the key — try again.", async () => {
    await assertAdmin();
    const { id } = parseOrThrow(revokeKeySchema, input);
    const revoked = await revokeApiKey(id);
    revalidatePath("/settings");
    return { revoked };
  });
}

/* ------------------------------------------------------------------ */
/* Data — re-index + purge                                              */
/* ------------------------------------------------------------------ */

/**
 * Re-index embeddings. Embeddings are content-hash idempotent, so a re-index is
 * the manual `npm run embed` pass — there's no per-posting event to replay
 * without a sweep. This action records the request and returns the operator
 * note; it never mutates, so it's safe to invoke repeatedly.
 */
export async function reindexEmbeddings(): Promise<ActionResult<{ note: string }>> {
  return runAction("Couldn't queue the re-index — try again.", async () => {
    await assertAdmin();
    return {
      note: "Re-index is idempotent (content-hash) — run `npm run embed` to rebuild changed vectors.",
    };
  });
}

/**
 * Purge ALL collected data — postings, embeddings, sweeps, dead letters, agent
 * runs/steps/assessments and the shortlist. The single-user profile, settings,
 * and API keys are kept. Destructive and irreversible: the confirm modal
 * restates the live object counts before this runs.
 */
export async function purgeData(): Promise<ActionResult<{ purged: true }>> {
  return runAction("Couldn't purge the data — try again.", async () => {
    await assertAdmin();
    await purgeAllData();
    revalidatePath("/settings");
    revalidatePath("/pipeline");
    revalidatePath("/browse");
    revalidatePath("/shortlist");
    revalidatePath("/agent");
    revalidatePath("/");
    return { purged: true as const };
  });
}

/** Re-export the read so the page can co-locate its settings fetch type. */
export type { AppSettings } from "@/lib/queries/settings";
export { getAppSettings };
