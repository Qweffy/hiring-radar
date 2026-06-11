# pgvector on Neon: HNSW + Hybrid Search — Best Practices
> Researched 2026-06-10. Sources verified against current official docs.

## TL;DR
- HNSW with defaults (`m=16`, `ef_construction=64`) is enough for 10–50k vectors; tune recall at query time with `hnsw.ef_search` (default 40 → raise to ~100 if results look thin), not by rebuilding.
- Embed with `{ pooling: 'mean', normalize: true }` in transformers.js, then use inner product (`<#>` + `vector_ip_ops`) — fastest for unit vectors per pgvector docs; cosine (`<=>` + `vector_cosine_ops`) is rank-equivalent. Pick one; the index opclass MUST match the query operator or you get a seq scan.
- ANN filtering is post-filtering: `WHERE` applies after the index returns candidates. Set `hnsw.iterative_scan = relaxed_order` (pgvector ≥ 0.8.0) so scans continue until `LIMIT` is satisfied.
- Hybrid search = `tsvector` GENERATED ALWAYS column + GIN index, fused with vector search via Reciprocal Rank Fusion `1/(k + rank)`, k ≈ 50–60; over-fetch ~40 rows per branch for a top-10.
- Re-rank the fused top ~25–50 with a cross-encoder (`Xenova/bge-reranker-base` via `@huggingface/transformers`); reserve LLM re-ranking (Groq) for agent paths where reasoning about relevance is needed.
- Drizzle has first-class pgvector (`vector()` column, `.using('hnsw', ...)` index, `cosineDistance()`/`innerProduct()` helpers); `tsvector` needs `customType`. Run the RRF query via `sql` template.

## Practices

**Create the HNSW index after bulk ingest, with cosine or IP opclass.**
At 10–50k × 384-dim vectors the index builds in seconds, but building after load is still faster and the pattern matters as data grows. On Neon, bump `maintenance_work_mem` (≤ 50–60% of compute RAM) and `max_parallel_maintenance_workers` for the build session. https://github.com/pgvector/pgvector#hnsw · https://neon.com/docs/extensions/pgvector

```sql
CREATE INDEX postings_embedding_idx ON postings
  USING hnsw (embedding vector_cosine_ops); -- defaults m=16, ef_construction=64
```

**Normalize embeddings and be consistent about the operator.**
pgvector: "If vectors are normalized to length 1 (like OpenAI embeddings), use inner product for best performance." `<#>` returns the *negative* inner product (Postgres only ASC-optimises operators), so `similarity = -1 * (a <#> b)`. With cosine, `similarity = 1 - (a <=> b)`. On normalized vectors both produce identical rankings — the choice is purely a speed micro-optimisation; cosine is the safer default if you might ever skip normalization. https://github.com/pgvector/pgvector#querying

**Tune recall with `ef_search`, per transaction.**
`SET LOCAL hnsw.ef_search = 100;` inside the query's transaction. Note: a plain HNSW scan returns at most `ef_search` rows, so `LIMIT` > `ef_search` silently truncates. https://github.com/pgvector/pgvector#query-options

**Filter metadata with iterative scans, not hope.**
The planner applies `WHERE month = ...` *after* the ANN scan; a filter matching 10% of rows leaves ~4 of 40 candidates. Fixes, in order: (1) `SET hnsw.iterative_scan = relaxed_order` (keeps scanning until `LIMIT` met; bounded by `hnsw.max_scan_tuples`, default 20 000); (2) B-tree index on the filter column so the planner can choose exact search for selective filters; (3) partial HNSW index per hot value (e.g. latest month). `strict_order` preserves exact distance order; `relaxed_order` gives better recall and is fine when you re-rank afterwards. https://github.com/pgvector/pgvector#filtering

**Keep a generated `tsvector` column with a GIN index for the lexical branch.**

```sql
ALTER TABLE postings ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(company, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(raw_text, '')), 'B')
  ) STORED;
CREATE INDEX postings_search_idx ON postings USING gin (search_vector);
```
No triggers, always in sync. https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns

**Fuse with RRF in one SQL statement.**
Rank each branch independently, over-fetch (~40 for a final 10 — the lists overlap less than you think), then sum `1/(k + rank)`. k≈50–60; smaller k weights top ranks harder. Pattern (after Jonathan Katz, pgvector maintainer):

```sql
WITH vec AS (
  SELECT id, RANK() OVER (ORDER BY embedding <=> $1) AS rank
  FROM postings ORDER BY embedding <=> $1 LIMIT 40
), fts AS (
  SELECT id, RANK() OVER (ORDER BY ts_rank_cd(search_vector, query) DESC) AS rank
  FROM postings, websearch_to_tsquery('english', $2) query
  WHERE search_vector @@ query LIMIT 40
)
SELECT COALESCE(vec.id, fts.id) AS id,
       COALESCE(1.0/(60 + vec.rank), 0) + COALESCE(1.0/(60 + fts.rank), 0) AS score
FROM vec FULL OUTER JOIN fts ON vec.id = fts.id
ORDER BY score DESC LIMIT 20;
```
https://jkatz05.com/post/postgres/hybrid-search-postgres-pgvector/

**Re-rank fused candidates with a local cross-encoder.**
Cross-encoders give +5–15 NDCG@10 over raw similarity at ~50–100 ms on CPU for small batches — run `Xenova/bge-reranker-base` through the same `@huggingface/transformers` runtime already used for embeddings (`pipeline('text-classification', ...)`, score each (query, posting) pair, sort). LLM re-ranking (Groq listwise) buys another ~5% accuracy at seconds of latency and per-call cost — use it only inside the agent loop, not the search endpoint. https://huggingface.co/Xenova/bge-reranker-base

**Drizzle integration.**

```ts
import { index, pgTable, serial, text, vector, customType } from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

export const postings = pgTable('postings', {
  id: serial('id').primaryKey(),
  rawText: text('raw_text').notNull(),
  embedding: vector('embedding', { dimensions: 384 }),
}, (t) => [
  index('postings_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
]);
```
`CREATE EXTENSION vector;` goes in a custom migration (`drizzle-kit generate --custom`). Simple similarity queries: `cosineDistance()` helper + `orderBy` + `limit`. The RRF query is raw `sql` via `db.execute()` — don't fight the query builder for window functions. https://orm.drizzle.team/docs/guides/vector-similarity-search

## Pitfalls
- **The official Drizzle guide's query skips the index** (`WHERE similarity > 0.5` wraps the column in an expression — drizzle-orm-docs issue #436). Order by raw distance ASC with LIMIT; apply score thresholds in JS afterwards. https://github.com/drizzle-team/drizzle-orm-docs/issues/436
- **Opclass/operator mismatch** (`vector_cosine_ops` index queried with `<#>`) silently falls back to seq scan. `EXPLAIN` once per query shape.
- **IVFFlat tutorials** (pre-2024) are stale defaults: IVFFlat needs training data, degrades on updates, and loses to HNSW on speed/recall. Use HNSW unless build time/memory becomes a problem.
- **`<#>` is negative**: forgetting the `-1 *` flip inverts your ranking.
- **`LIMIT` starvation**: filtered ANN without iterative scans returns fewer rows than `LIMIT` with no error — looks like "missing data".
- **Hybrid sub-query `LIMIT` too small** → near-empty branch overlap and unstable RRF scores; over-fetch 3–4× the final k.
- **Neon extension lag**: Neon ships pgvector one minor behind upstream and new versions need a compute restart before `ALTER EXTENSION vector UPDATE` works. https://neon.com/docs/extensions/pg-extensions
- **`@xenova/transformers` is the deprecated package name** — old tutorials still import it; use `@huggingface/transformers`.
- **Embedding dimension drift**: the `dimensions` in the Drizzle schema must match the model (bge-small-en-v1.5 / all-MiniLM-L6-v2 = 384). Changing models means re-embedding everything; don't mix.

## Version notes
- **pgvector 0.8.2** is current upstream (fixes CVE-2026-3172, buffer overflow in parallel HNSW builds). Neon ships **0.8.1 on Postgres 18**, 0.8.0 on PG14–17 — create the Neon project on PG18. Iterative scans require ≥ 0.8.0. https://www.postgresql.org/about/news/pgvector-082-released-3245/
- **drizzle-orm 0.45.2** / **drizzle-kit 0.31.10** current on npm; native `vector` type and HNSW index builder since 0.31.0/0.22.0 — no extra pgvector npm package needed.
- **@huggingface/transformers 4.2.0** current; covers both embedding (`feature-extraction`) and re-ranking (`text-classification` with `Xenova/bge-reranker-base`).
- Install: `npm i drizzle-orm @neondatabase/serverless @huggingface/transformers` + `npm i -D drizzle-kit`.
