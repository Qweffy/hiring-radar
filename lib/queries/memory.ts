import "server-only";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { agentMemories, type memoryKind } from "@/db/schema";
import { embed } from "@/lib/embeddings";
import {
  blendScore,
  CANDIDATE_POOL,
  DEDUP_SIM,
  effectiveStrength,
  RECALL_K,
  STRENGTH_FLOOR,
} from "@/lib/memory/decay";

/**
 * Server-only access to the agent's long-term memory (db/schema.ts:agentMemories).
 * Recall fetches an ANN candidate pool by cosine distance, then re-ranks in TS
 * with the decay model in lib/memory/decay.ts — the index serves the `<=> ...
 * LIMIT` shape, the strength math lives in code so it stays testable. Embeddings
 * are best-effort: embed() throws on a runtime without the native onnx lib, so
 * every call site catches and degrades to decay-only ranking instead of failing.
 *
 * neon-http has no transactions — every write here is one statement or an
 * idempotent upsert, matching lib/queries/agent-writes.ts.
 */

/** The enum's value type, derived from the schema so the two never drift. */
export type MemoryKind = (typeof memoryKind.enumValues)[number];

/** One recalled memory, with its computed recall score for ordering/inspection. */
export interface MemoryRow {
  id: number;
  kind: MemoryKind;
  content: string;
  postingId: number | null;
  company: string | null;
  salience: number;
  accessCount: number;
  lastAccessedAt: Date;
  sourceRunId: number | null;
  createdAt: Date;
  /** Final ranking score: blendScore(sim, strength) with a query, else strength. */
  score: number;
}

/** Raw row shape from the candidate CTE — distance is null on the no-query path. */
interface CandidateRow extends Record<string, unknown> {
  id: number;
  kind: MemoryKind;
  content: string;
  posting_id: number | null;
  company: string | null;
  salience: number;
  access_count: number;
  last_accessed_at: string | Date;
  source_run_id: number | null;
  created_at: string | Date;
  distance: number | null;
}

function vecLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/** Embed text, or null when the embedding runtime is unavailable (degrade, never throw). */
async function tryEmbed(text: string): Promise<number[] | null> {
  try {
    return await embed(text);
  } catch (e) {
    console.warn(
      "memory: embeddings unavailable, degrading to decay-only ranking —",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function mapRow(row: CandidateRow, score: number): MemoryRow {
  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    postingId: row.posting_id,
    company: row.company,
    salience: row.salience,
    accessCount: row.access_count,
    lastAccessedAt: toDate(row.last_accessed_at),
    sourceRunId: row.source_run_id,
    createdAt: toDate(row.created_at),
    score,
  };
}

const HNSW_EF_SEARCH = 80;

/** Build the optional `kind IN (...)` fragment, binding each value individually. */
function kindPredicate(kinds: MemoryKind[] | undefined): SQL | null {
  if (kinds === undefined || kinds.length === 0) return null;
  const values = sql.join(
    kinds.map((k) => sql`${k}`),
    sql`, `,
  );
  return sql`kind in (${values})`;
}

/**
 * Recall the top-k memories for a query, ranked by decayed strength (and blended
 * with cosine similarity when a query is given). When a query is supplied, an ANN
 * candidate pool is fetched by cosine distance; without one, the most-salient
 * pool is fetched by raw strength inputs and ranked on decay alone. Recalled rows
 * are reinforced (access_count+1, last_accessed_at=now) in a single update.
 */
export async function recallMemories(input: {
  query?: string;
  k?: number;
  kinds?: MemoryKind[];
}): Promise<MemoryRow[]> {
  const k = input.k ?? RECALL_K;
  const kindFrag = kindPredicate(input.kinds);
  const queryVec =
    input.query !== undefined && input.query.length > 0
      ? await tryEmbed(input.query)
      : null;

  const whereFrag = kindFrag ?? sql`true`;
  const now = new Date();

  let candidates: CandidateRow[];
  if (queryVec === null) {
    // Decay-only path: no usable query vector. Pull the freshest/most-salient
    // pool (a recently-accessed, high-salience row is the strongest), then rank
    // by effectiveStrength in TS. distance is null → blendScore isn't used.
    const rows = await db.execute<CandidateRow>(sql`
      select id, kind, content, posting_id, company, salience,
             access_count, last_accessed_at, source_run_id, created_at,
             null::float8 as distance
      from agent_memories
      where ${whereFrag}
      order by last_accessed_at desc, salience desc
      limit ${CANDIDATE_POOL}
    `);
    candidates = rows.rows;
  } else {
    // ANN path: fetch the nearest pool by cosine distance via the set_config CTE
    // (mirrors lib/search/engine.ts — neon-http has no txn, so the GUC is scoped
    // per-statement with local=true). cosineSim = 1 - distance.
    const lit = vecLiteral(queryVec);
    const rows = await db.execute<CandidateRow>(sql`
      with cfg as (
        select
          set_config('hnsw.ef_search', ${String(HNSW_EF_SEARCH)}, true),
          set_config('hnsw.iterative_scan', 'relaxed_order', true)
      )
      select id, kind, content, posting_id, company, salience,
             access_count, last_accessed_at, source_run_id, created_at,
             (embedding <=> ${lit}::vector) as distance
      from cfg, agent_memories
      where ${whereFrag}
      order by embedding <=> ${lit}::vector
      limit ${CANDIDATE_POOL}
    `);
    candidates = rows.rows;
  }

  const ranked: MemoryRow[] = [];
  for (const row of candidates) {
    const strength = effectiveStrength(
      row.salience,
      toDate(row.last_accessed_at),
      now,
      row.access_count,
    );
    const score =
      row.distance === null
        ? strength
        : blendScore(1 - row.distance, strength);
    if (score < STRENGTH_FLOOR) continue;
    ranked.push(mapRow(row, score));
  }

  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, k);

  if (top.length > 0) {
    const ids = top.map((m) => m.id);
    await db
      .update(agentMemories)
      .set({
        accessCount: sql`${agentMemories.accessCount} + 1`,
        lastAccessedAt: sql`now()`,
      })
      .where(inArray(agentMemories.id, ids));
  }

  return top;
}

export interface RememberResult {
  action: "inserted" | "reinforced";
  id: number;
}

/**
 * Persist a memory, deduping so the store doesn't accumulate near-duplicates:
 *
 *  - A verdict scoped to a posting/company reinforces the existing verdict for
 *    that same subject (one verdict per subject), if any.
 *  - Otherwise the nearest same-kind memory within DEDUP_SIM cosine is merged.
 *  - Else a fresh row is inserted.
 *
 * Reinforce = max(old, new) salience, refreshed content+embedding, access_count+1,
 * last_accessed_at=now. Every branch is a single statement (neon-http has no txn).
 */
export async function rememberMemory(input: {
  kind: MemoryKind;
  text: string;
  salience: number;
  postingId?: number;
  company?: string;
  sourceRunId?: number;
}): Promise<RememberResult> {
  const vec = await embed(input.text);
  const lit = vecLiteral(vec);

  const existingId = await findDedupTarget(input, lit);
  if (existingId !== null) {
    const rows = await db
      .update(agentMemories)
      .set({
        content: input.text,
        embedding: vec,
        salience: sql`greatest(${agentMemories.salience}, ${input.salience})`,
        accessCount: sql`${agentMemories.accessCount} + 1`,
        lastAccessedAt: sql`now()`,
      })
      .where(eq(agentMemories.id, existingId))
      .returning({ id: agentMemories.id });
    const id = rows[0]?.id;
    if (id === undefined) throw new Error("memory reinforce returned no row");
    return { action: "reinforced", id };
  }

  const rows = await db
    .insert(agentMemories)
    .values({
      kind: input.kind,
      content: input.text,
      embedding: vec,
      salience: input.salience,
      postingId: input.postingId ?? null,
      company: input.company ?? null,
      sourceRunId: input.sourceRunId ?? null,
    })
    .returning({ id: agentMemories.id });
  const id = rows[0]?.id;
  if (id === undefined) throw new Error("memory insert returned no row");
  return { action: "inserted", id };
}

/**
 * Find the row a remember should merge into: the existing verdict for this
 * posting/company subject, else the nearest same-kind memory within DEDUP_SIM.
 * Returns null when nothing qualifies (→ insert a new row).
 */
async function findDedupTarget(
  input: {
    kind: MemoryKind;
    postingId?: number;
    company?: string;
  },
  lit: string,
): Promise<number | null> {
  if (
    input.kind === "verdict" &&
    (input.postingId !== undefined || input.company !== undefined)
  ) {
    const subject =
      input.postingId !== undefined
        ? eq(agentMemories.postingId, input.postingId)
        : eq(agentMemories.company, input.company ?? "");
    const found = await db
      .select({ id: agentMemories.id })
      .from(agentMemories)
      .where(and(eq(agentMemories.kind, "verdict"), subject))
      .limit(1);
    return found[0]?.id ?? null;
  }

  // Nearest same-kind neighbor by cosine; merge only if within DEDUP_SIM.
  const rows = await db.execute<{ id: number; distance: number }>(sql`
    with cfg as (
      select
        set_config('hnsw.ef_search', ${String(HNSW_EF_SEARCH)}, true),
        set_config('hnsw.iterative_scan', 'relaxed_order', true)
    )
    select id, (embedding <=> ${lit}::vector) as distance
    from cfg, agent_memories
    where kind = ${input.kind}
    order by embedding <=> ${lit}::vector
    limit 1
  `);
  const nearest = rows.rows[0];
  if (nearest === undefined) return null;
  const sim = 1 - nearest.distance;
  return sim >= DEDUP_SIM ? nearest.id : null;
}
