# Hiring Radar

A scanner for Hacker News "Who is hiring?" threads. Ingests each monthly thread,
parses the free-text postings into structured fields with an LLM, and makes the
whole corpus searchable — by exact match, by meaning, or by both at once.

Built on Next.js 16 (App Router), Postgres (Neon) with `pgvector`, Drizzle ORM,
and local `@huggingface/transformers` embeddings.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL / DATABASE_URL_UNPOOLED, GROQ_API_KEY
npm run db:migrate           # apply schema + pgvector / tsvector indexes
npm run ingest               # pull the latest "Who is hiring?" thread
npm run embed                # compute embeddings for new/changed postings
npm run dev                  # http://localhost:3000/browse
```

## Scripts

| Script                 | What it does                                              |
| ---------------------- | -------------------------------------------------------- |
| `npm run ingest`       | Fetch + store the current month's HN thread postings.    |
| `npm run embed`        | Embed new/changed postings (idempotent by content hash). |
| `npm run bench:search` | Run the retrieval benchmark (recall@10 / MRR per mode).  |
| `npm run db:migrate`   | Apply Drizzle migrations against `DATABASE_URL_UNPOOLED`.|
| `npm run inngest:dev`  | Start the local Inngest Dev Server (auto-discovers `/api/inngest`). |
| `npm test`             | Vitest unit suite.                                       |

## Pipeline (Inngest)

`npm run ingest` / `npm run embed` are the manual/backfill path. The event-driven
pipeline runs the same logic incrementally:

- **discoverThreads** — cron (every 6h on days 1–3) finds the latest
  "Who is hiring?" thread and emits `hn/sweep.requested`.
- **runSweep** — fetches + diffs the thread, writes a `sweeps` row, and fans out
  one `hn/posting.upserted` per new/changed posting.
- **processPosting** — per posting: parse (Groq) → embed, with independent
  retries. 429 → `RetryAfterError`; deterministic parse failure →
  `NonRetriableError`; the `onFailure` handler writes a `dead_letters` row.

Local dev requires `INNGEST_DEV=1` in `.env.local` (v4 defaults to cloud mode).
Run `npm run dev` (port 3000) and `npm run inngest:dev` side by side — the Dev
Server UI at `localhost:8288` auto-discovers `/api/inngest` and lets you trigger
events and replay runs. Deployed environments need `INNGEST_EVENT_KEY` +
`INNGEST_SIGNING_KEY` and a dashboard sync.

## Retrieval

Browse supports three search modes, selectable from the toolbar segmented
control (`?mode=`). With no query the list falls back to recency-ordered Exact.

- **Exact** — `ILIKE` over company / role / location / raw text. Recency-ordered.
- **Semantic** — vector cosine kNN over `posting_embeddings` (pgvector HNSW),
  query embedded with `MongoDB/mdbr-leaf-ir` (384-dim, mean-pooled, normalized).
- **Hybrid** — a lexical branch (`websearch_to_tsquery` over a generated
  `tsvector` + GIN) and the vector branch, each over-fetched ~40 rows and fused
  with Reciprocal Rank Fusion (`1/(k+rank)`, `k=60`) in a single SQL statement.

All three apply the same metadata filters (month / remote / stack / salary /
visa). Semantic and hybrid attach a `<mark>`-highlighted relevance snippet per
row (`ts_headline`, falling back to a leading window for pure-vector hits).
`hnsw.ef_search` and `hnsw.iterative_scan = relaxed_order` are set per statement
so filtered ANN scans keep going until `LIMIT` is satisfied. See
[`docs/best-practices/pgvector-hybrid-search.md`](docs/best-practices/pgvector-hybrid-search.md).

### Benchmark

`npm run bench:search` evaluates 12 hand-labelled queries against a gold set
derived from **structured fields** (role / stack tags), not from any single
retrieval method, so no mode is trivially favoured. Corpus: 294 postings for
`2026-06`, all embedded.

| Mode     | recall@10 | MRR   | avg latency |
| -------- | --------- | ----- | ----------- |
| Exact    | 0.140     | 0.156 | ~199 ms     |
| Semantic | 0.276     | 0.283 | ~351 ms     |
| Hybrid   | 0.521     | 0.737 | ~348 ms     |

Hybrid roughly doubles semantic recall and lifts MRR to 0.74 — the RRF fusion
recovers the lexical exact-term hits that pure vectors miss (e.g. a literal
"Rust" or "Kubernetes") while keeping the semantic matches that `ILIKE` can't
reach. Exact is fastest (no embedding round-trip) but its recall ceiling is low
on natural-language queries.

ANN vs exact-scan (vector top-10) is ~150–215 ms either way at 294 vectors —
both fast at this scale; the HNSW index's advantage widens as the corpus grows.

## Architecture notes

- **Migrations** run against the unpooled connection via `drizzle-kit`; the app
  uses `neon-http` (no transactions), so per-statement GUCs are set with an
  inline `set_config(..., true)` CTE rather than `SET LOCAL`.
- **Embeddings** run locally (CPU) through a process-wide lazy singleton
  pipeline cached under `.cache/transformers`; index and query vectors must come
  from the same model + dtype.
- `lib/search/engine.ts` holds the query logic (importable by the bench CLI);
  `lib/queries/search.ts` is the `server-only` app-facing wrapper.

## Engineering conventions

The house style — architecture & data flow, the hard code rules (no `any`,
parse-before-trust, `server-only` data access, the `runAction`/`ActionError`
result pattern), AI/agent conventions (zod-on-LLM-output, spotlighting, cost
budgets), design-system rules, and commit/workflow discipline — lives in
[`AGENTS.md`](AGENTS.md). Read it before contributing; it's the same doc the
coding agents follow, and the enforced floor is `npm run lint`.
