// NOTE: no "server-only" here — the stdio MCP CLI (tsx, outside the React-server
// context) imports verifyApiKey/getScope from this module, exactly like
// lib/auth-token.ts is shared by proxy.ts. A `server-only` import would throw at
// import time in the CLI bundle. App-facing data access (the Settings UI) wraps
// the list/create/revoke helpers behind lib/queries/* (which ARE server-only);
// the verify path stays framework-free so both transports can call it.
//
// Key model: the raw key (`hrk_…`) is shown ONCE at creation and never stored —
// only its sha256 (keyHash) for lookup and the first ~8 chars (keyPrefix) for
// display. See db/schema.ts (apiKeys).
import { createHash, randomBytes } from "node:crypto";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { apiKeys } from "@/db/schema";

/** Bearer scope. Mirrors the api_key_scope pgEnum. */
export type ApiKeyScope = "read" | "read_write";

/** Prefix every raw key carries, so a leaked token is recognisable at a glance. */
const KEY_PREFIX = "hrk_";

/** Chars of the raw key kept for display ("hrk_3a9f…") — includes the `hrk_`. */
const DISPLAY_PREFIX_LEN = 8;

export interface GeneratedApiKey {
  /** The full raw key — returned ONCE, shown to the user, never persisted. */
  raw: string;
  /** First ~8 chars of the raw key, stored for display. */
  prefix: string;
  /** sha256(raw), stored for verification. */
  hash: string;
}

function toBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** sha256 of the raw key, hex-encoded. The only form of the key we persist. */
function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Mint a fresh key: `hrk_` + base64url(32 random bytes). Returns the raw key
 * (to show once), its display prefix, and its hash (to store). The caller
 * persists prefix + hash via createApiKey and surfaces `raw` exactly once.
 */
export function generateApiKey(): GeneratedApiKey {
  const raw = KEY_PREFIX + toBase64Url(randomBytes(32));
  return {
    raw,
    prefix: raw.slice(0, DISPLAY_PREFIX_LEN),
    hash: sha256(raw),
  };
}

export type VerifyApiKeyResult =
  | { ok: true; scope: ApiKeyScope }
  | { ok: false };

/**
 * Verify a raw bearer token: look up the row by sha256(raw), reject if missing
 * or revoked, and bump lastUsedAt on success. That last write is deliberate —
 * it keeps the Settings "connected clients" indicator live. Returns the key's
 * scope on success. Pass the bare token (no "Bearer " prefix).
 */
export async function verifyApiKey(
  rawBearer: string,
): Promise<VerifyApiKeyResult> {
  if (rawBearer.length === 0) return { ok: false };

  const hash = sha256(rawBearer);
  const rows = await db
    .select({ id: apiKeys.id, scope: apiKeys.scope, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  const row = rows[0];
  if (row?.revokedAt !== null) return { ok: false };

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));

  return { ok: true, scope: row.scope };
}

/**
 * Resolve a raw bearer to its scope without bumping lastUsedAt — a read-only
 * authorization check for tool handlers that have already been verified once in
 * the same request. Returns null for an unknown or revoked key.
 */
export async function getScope(rawBearer: string): Promise<ApiKeyScope | null> {
  if (rawBearer.length === 0) return null;

  const hash = sha256(rawBearer);
  const rows = await db
    .select({ scope: apiKeys.scope, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  const row = rows[0];
  if (row?.revokedAt !== null) return null;
  return row.scope;
}

/** A key as shown in the Settings list — never includes the raw key or hash. */
export interface ApiKeySummary {
  id: number;
  name: string;
  scope: ApiKeyScope;
  keyPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

/**
 * All keys, active first (non-revoked), newest within each group. Drives the
 * Settings key list. Revoked keys are kept for the audit trail.
 */
export async function listApiKeys(): Promise<ApiKeySummary[]> {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      scope: apiKeys.scope,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt));
}

export interface CreateApiKeyResult {
  id: number;
  /** The raw key — surface this ONCE; it cannot be recovered later. */
  raw: string;
  summary: ApiKeySummary;
}

/**
 * Mint and persist a new key. Stores only prefix + hash; returns the raw key
 * once so the caller can show it. Single insert — neon-http has no transactions.
 */
export async function createApiKey(input: {
  name: string;
  scope: ApiKeyScope;
}): Promise<CreateApiKeyResult> {
  const { raw, prefix, hash } = generateApiKey();
  const rows = await db
    .insert(apiKeys)
    .values({
      name: input.name,
      scope: input.scope,
      keyPrefix: prefix,
      keyHash: hash,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      scope: apiKeys.scope,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    });

  const row = rows[0];
  if (!row) throw new Error("api key insert returned no row");
  return { id: row.id, raw, summary: row };
}

/**
 * Revoke a key by id — sets revokedAt, keeping the row for the audit trail.
 * Idempotent: re-revoking an already-revoked key leaves the original timestamp
 * (the `isNull(revokedAt)` guard means the second call updates nothing).
 * Returns true if this call performed the revocation.
 */
export async function revokeApiKey(id: number): Promise<boolean> {
  const rows = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id });
  return rows.length > 0;
}
