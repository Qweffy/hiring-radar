// NOTE: no "server-only" here — scripts/bench-search.ts (tsx) imports this
// engine directly, like lib/embeddings.ts. The app-facing wrapper that IS
// server-only lives in lib/queries/search.ts.
import { sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import  { type BrowseFilters } from "@/lib/browse-params";
import { embed } from "@/lib/embeddings";

/**
 * Hybrid retrieval over postings: a lexical branch (tsvector FTS) and a vector
 * branch (pgvector HNSW), fused with Reciprocal Rank Fusion. See
 * docs/best-practices/pgvector-hybrid-search.md.
 *
 * exact   → handled by the ILIKE path in lib/queries/postings.ts (not here).
 * semantic → vector cosine top-N only.
 * hybrid  → FTS + vector, fused via RRF in one SQL statement.
 */

// RRF constant: smaller k weights the top ranks harder. The doc lands on ~50-60.
const RRF_K = 60;
// Over-fetch per branch — the two ranked lists overlap less than you'd expect,
// so a final top-50 page needs a wider candidate pool from each side.
const OVERFETCH = 40;
// Retrieval ceiling for the semantic branch. Vectors past this rank are noise;
// capping keeps the `ORDER BY <=> ... LIMIT` shape that the HNSW index serves
// (an unbounded distance scan would degrade to an exact seq scan) and gives the
// UI a stable, honest page count ("of up to MAX_RESULTS best matches").
const MAX_RESULTS = 100;
// HNSW recall knob. Default is 40; a plain scan returns at most ef_search rows,
// so it must comfortably exceed the per-branch fetch or candidates get silently
// truncated. Sized above MAX_RESULTS to feed the semantic ceiling.
const EF_SEARCH = 120;

export interface SearchResult {
  /** posting ids in ranked order — the page slice the caller asked for. */
  ids: number[];
  /** id → relevance snippet, only for ids on the returned page. */
  snippets: Map<number, string>;
  total: number;
}

/**
 * The shared metadata predicate, as a raw SQL fragment, so every branch (FTS,
 * vector, count) filters identically. Mirrors buildConditions in postings.ts —
 * never includes the `q` text (that's what the branches themselves match on).
 */
function metadataPredicate(f: BrowseFilters, month: string | null): SQL {
  const conds: SQL[] = [
    sql`p.parse_status <> 'skipped'`,
    sql`p.is_deleted = false`,
  ];
  if (month !== null) conds.push(sql`p.month = ${month}`);
  if (f.remote.length > 0) {
    // Bind each enum value individually — the neon driver mis-serializes a JS
    // array passed to any()/::enum[] ("malformed array literal").
    const values = sql.join(
      f.remote.map((v) => sql`${v}`),
      sql`, `,
    );
    conds.push(sql`p.remote_policy in (${values})`);
  }
  if (f.stack.length > 0) {
    // arrayOverlaps — at least one selected tag present on the posting. Build
    // the array() from individually-bound elements for the same reason.
    const elems = sql.join(
      f.stack.map((t) => sql`${t}`),
      sql`, `,
    );
    conds.push(sql`p.stack_tags && array[${elems}]::text[]`);
  }
  if (f.salaryMin !== null) {
    conds.push(sql`coalesce(p.salary_max, p.salary_min) >= ${f.salaryMin}`);
  }
  if (f.visa) conds.push(sql`p.visa_sponsorship = true`);
  return sql.join(conds, sql` and `);
}

/** ts_headline config: short, single-fragment, <mark>…</mark> around matches. */
const HEADLINE_OPTS =
  "StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=24, MinWords=8, ShortWord=2";

/** Build the snippet expression for a query, over a posting alias `p`. */
function headlineExpr(query: string): SQL {
  return sql`ts_headline(
    'english', p.raw_text, websearch_to_tsquery('english', ${query}),
    ${HEADLINE_OPTS}
  )`;
}

/**
 * Plain-text fallback window: first ~140 chars of raw text, used when FTS finds
 * no lexical match (pure semantic hits). No markup — the UI renders it as-is.
 */
function plainWindow(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 140);
}

/** semantic: vector cosine top-N over posting_embeddings, with metadata filters. */
async function semanticSearch(
  f: BrowseFilters,
  month: string | null,
  limit: number,
  offset: number,
): Promise<SearchResult> {
  const queryVec = await embed(f.q);
  const vecLiteral = `[${queryVec.join(",")}]`;
  const predicate = metadataPredicate(f, month);

  // set_config(..., true) sets the GUC for THIS statement only (neon-http wraps
  // each execute in an implicit txn); local=true auto-resets afterwards. Order
  // by raw distance with LIMIT — never a similarity threshold (that bypasses
  // the index, per the doc's pitfall).
  // Index-friendly shape: `ORDER BY embedding <=> q LIMIT MAX_RESULTS` is what
  // the HNSW index serves. We retrieve the ceiling once, count it (= total), and
  // slice the requested page from it. count(*) OVER () runs over the bounded
  // candidate CTE, so it's the pool size, not just the page.
  const rows = await db.execute<{ id: number; snippet: string; raw_text: string; n: number }>(sql`
    with cfg as (
      select
        set_config('hnsw.ef_search', ${String(EF_SEARCH)}, true),
        set_config('hnsw.iterative_scan', 'relaxed_order', true)
    ),
    candidates as (
      select p.id, p.raw_text as raw_text
      from cfg, posting_embeddings pe
      join postings p on p.id = pe.posting_id
      where ${predicate}
      order by pe.embedding <=> ${vecLiteral}::vector
      limit ${MAX_RESULTS}
    ),
    paged as (
      select id, raw_text, count(*) over () as n
      from candidates
      limit ${limit} offset ${offset}
    )
    select id,
           ${headlineExpr(f.q)} as snippet,
           raw_text,
           n
    from paged p
  `);

  return rowsToResult(rows.rows);
}

/**
 * hybrid: FTS branch (websearch_to_tsquery over search_tsv) + vector branch,
 * over-fetched and fused with RRF in a single SQL statement. Snippets come from
 * ts_headline; rows with no lexical overlap fall back to a plain window.
 */
async function hybridSearch(
  f: BrowseFilters,
  month: string | null,
  limit: number,
  offset: number,
): Promise<SearchResult> {
  const queryVec = await embed(f.q);
  const vecLiteral = `[${queryVec.join(",")}]`;
  const predicate = metadataPredicate(f, month);

  const rows = await db.execute<{
    id: number;
    snippet: string | null;
    raw_text: string;
    n: number;
  }>(sql`
    with cfg as (
      select
        set_config('hnsw.ef_search', ${String(EF_SEARCH)}, true),
        set_config('hnsw.iterative_scan', 'relaxed_order', true)
    ),
    q as (
      select websearch_to_tsquery('english', ${f.q}) as tsq
    ),
    fts as (
      select p.id,
             rank() over (
               order by ts_rank_cd(p.search_tsv, q.tsq) desc
             ) as rank
      from cfg, postings p, q
      where ${predicate} and p.search_tsv @@ q.tsq
      limit ${OVERFETCH}
    ),
    vec as (
      select p.id,
             rank() over (order by pe.embedding <=> ${vecLiteral}::vector) as rank
      from cfg, posting_embeddings pe
      join postings p on p.id = pe.posting_id
      where ${predicate}
      order by pe.embedding <=> ${vecLiteral}::vector
      limit ${OVERFETCH}
    ),
    fused as (
      select
        coalesce(fts.id, vec.id) as id,
        coalesce(1.0 / (${RRF_K} + fts.rank), 0.0)
          + coalesce(1.0 / (${RRF_K} + vec.rank), 0.0) as score,
        -- count the full fused pool BEFORE pagination → honest total.
        count(*) over () as n
      from fts
      full outer join vec on fts.id = vec.id
    ),
    paged as (
      select id, score, n
      from fused
      order by score desc, id asc
      limit ${limit} offset ${offset}
    )
    select paged.id,
           paged.n,
           p.raw_text as raw_text,
           ts_headline(
             'english', p.raw_text, (select tsq from q),
             ${HEADLINE_OPTS}
           ) as snippet
    from paged
    join postings p on p.id = paged.id
    order by paged.score desc, paged.id asc
  `);

  return rowsToResult(rows.rows);
}

/** Shared row → SearchResult mapping for both branches. */
function rowsToResult(
  rows: { id: number; snippet: string | null; raw_text: string; n: number }[],
): SearchResult {
  const ids: number[] = [];
  const snippets = new Map<number, string>();
  for (const r of rows) {
    ids.push(r.id);
    // ts_headline returns the bare text (no <mark>) when nothing matched — fall
    // back to a clean leading window so semantic-only hits still show context.
    const hasMark = r.snippet?.includes("<mark>") ?? false;
    snippets.set(r.id, hasMark && r.snippet ? r.snippet : plainWindow(r.raw_text));
  }
  return { ids, snippets, total: rows[0]?.n ?? 0 };
}

/**
 * Entry point for the semantic/hybrid paths. Returns ranked posting ids for the
 * requested page plus per-row snippets. `exact` is NOT routed here — the caller
 * keeps the existing ILIKE query for exact-match behavior.
 */
export async function searchPostings(
  f: BrowseFilters,
  month: string | null,
  limit: number,
  offset: number,
): Promise<SearchResult> {
  if (f.mode === "semantic") {
    return semanticSearch(f, month, limit, offset);
  }
  return hybridSearch(f, month, limit, offset);
}
