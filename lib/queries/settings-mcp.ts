import "server-only";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { agentRuns, postings, shortlistEntries } from "@/db/schema";
import { listApiKeys, type ApiKeySummary } from "@/lib/mcp/api-keys";

/**
 * Server-only read side for the Settings MCP & Data panels. The raw key
 * helpers (list/create/revoke/verify) live in lib/mcp/api-keys.ts — that module
 * is intentionally NOT `server-only` because the stdio CLI imports its verify
 * path. The Settings UI is App-facing, so its reads are wrapped here behind the
 * `server-only` guard, the same split the api-keys.ts header documents.
 */

export type { ApiKeySummary } from "@/lib/mcp/api-keys";

/** The key list as shown in Settings — active first, newest within each group. */
export async function getApiKeys(): Promise<ApiKeySummary[]> {
  return listApiKeys();
}

/**
 * Object counts the Purge confirm modal restates ("Purge 512 postings, 8
 * shortlist entries and 24 runs?"). One round-trip, three scalar COUNTs.
 */
export interface DataObjectCounts {
  postings: number;
  shortlistEntries: number;
  agentRuns: number;
}

export async function getDataObjectCounts(): Promise<DataObjectCounts> {
  const [posting, shortlist, runs] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(postings),
    db.select({ n: sql<number>`count(*)::int` }).from(shortlistEntries),
    db.select({ n: sql<number>`count(*)::int` }).from(agentRuns),
  ]);

  return {
    postings: posting[0]?.n ?? 0,
    shortlistEntries: shortlist[0]?.n ?? 0,
    agentRuns: runs[0]?.n ?? 0,
  };
}
