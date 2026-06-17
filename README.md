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

## Agent memory (long-term)

Two kinds of memory back the matching agent. **Working memory** is the per-run
message array — the system prompt, the postings it read, its own reasoning — and
it dies when the run ends. **Long-term memory** (`agent_memories`) is durable: it
survives across runs, is retrieved semantically, decays over time, and is
rewritten by a consolidation step. Without it, every monthly scan starts cold and
re-derives the same verdicts; with it, run #2 reads what run #1 learned.

- **Store.** `agent_memories` holds three kinds — `fact`, `preference`,
  `verdict` — each with the text, a 384-dim embedding (the same `mdbr-leaf-ir`
  model as search), an intrinsic `salience` (0–1), an `access_count`, and a
  `last_accessed_at`. Verdicts denormalize `company`, so a judgment outlives the
  posting it was made on. An HNSW `vector_cosine_ops` index serves ANN recall.
- **Decay (`lib/memory/decay.ts` — pure, unit-tested).** A memory's *effective
  strength* is its salience decayed by idle time and lifted by reuse:
  `salience · 2^-(ageDays / 30) · (1 + 0.15·ln(1 + accessCount))` — a 30-day
  half-life with a `0.1` floor below which it's forgotten. Recall blends this with
  query similarity (`clamp01(cosine) · strength`), so a stale memory needs a
  strong semantic hit to surface while a fresh one floats up on its own. **Recall
  reinforces**: returned rows get `access_count++` and `last_accessed_at = now()`,
  so the act of remembering slows forgetting.
- **Recall + write (`lib/queries/memory.ts`).** `recallMemories()` embeds the
  query, pulls a 40-row candidate pool by cosine via the same
  `set_config('hnsw.ef_search', …, true)` CTE search uses, then ranks in TS by the
  decay math and returns the top `k`. `rememberMemory()` dedupes before inserting:
  a verdict keyed on company is reinforced/updated in place; otherwise a same-kind
  neighbor at cosine ≥ `0.92` is merged (salience = max, content refreshed). Every
  write is a single-statement upsert (neon-http has no transactions).
- **Two new tools.** Beyond the five read-only / own-data tools, the agent gets
  `recall_memory` (read) and `remember` (a bounded, schema-validated write to its
  *own* memory store — not external comms, so the "no lethal trifecta" property
  from [Security](#security) still holds).
- **Priming.** A fresh run recalls the top 6 memories against the profile summary
  and persists them as the run's **first `reasoning` step (idx 0)** — so the block
  shows in the trace and `rebuildMessages` reconstructs it verbatim on resume,
  with zero schema change and full checkpoint-safety. A true cold start (no
  memories yet) skips priming.
- **Consolidation.** At the end of a completed run, `consolidateRun()`
  (`lib/agent/consolidate.ts`) writes one `verdict` memory per assessed company
  deterministically — salience from score extremity (`|score − 50| / 50`) — and
  makes a *single* cheap LLM call to distil 0–3 `preference` memories from the
  run's dismissals. Its cost is accrued onto the run, and a consolidation fault
  never flips a completed run to failed.

**The payoff.** Run #1 scans cold and consolidates its verdicts. Run #2 opens with
the primed block already in its trace, calls `recall_memory`, recognizes a company
it has already judged, and skips re-assessing it — fewer steps and lower cost for
the same coverage. (Verified locally end-to-end: the warm run shows the primed
idx-0 block and a `recall_memory` call, and reinforced memories climb in
`access_count`. The size of the saving scales with how much of the month is
unchanged; a clean back-to-back comparison is bounded by the Groq free-tier daily
quota.)

> **Prod note.** Writing a memory needs a query/text embedding (the `embedding`
> column is `NOT NULL`), and recall ranks against one. On Vercel serverless the
> native onnx runtime can't load (the same caveat as search), so in prod recall
> **degrades to decay-only ranking** over already-stored memories and new writes
> (`remember` / consolidation) are skipped gracefully rather than crashing the
> run. Wiring a hosted embedding API behind `embed()` restores both — the same
> one-line fix that restores semantic search.

## Security

**Threat model.** Every HN "Who is hiring?" posting is hostile user-generated content. A posting body (or a search snippet derived from it) can contain text engineered to hijack the LLM — "ignore previous instructions", a forged system role, a Markdown-image exfiltration beacon, base64/zero-width-smuggled commands, a forged closing delimiter, or a second-order payload aimed at a later agent stage. We assume injection is *unsolved* (OWASP LLM01): some attempts will partially succeed at the model layer, so the design bounds the blast radius rather than relying on prevention.

**Layered defense.** Five independent layers, each load-bearing on its own:

1. **Spotlighting.** Every untrusted string entering a prompt — posting bodies, search snippets, CV text — is wrapped by `spotlight()` (`lib/agent/spotlight.ts`) in a `<data-{marker}>` fence whose marker is randomized per call. Any forged copy of that exact marker is stripped from the content first, so a posting can't close the fence and "break out". (Microsoft's spotlighting cuts indirect-injection success from >50% to <2%.)
2. **Instructions only in the system message.** The agent's task, tools, and rules live solely in `SYSTEM_PROMPT` (`lib/agent/prompt.ts`); the extractors keep a byte-stable SYSTEM string. Postings and tool results are delivered as fenced data in `user`/`tool` messages — never concatenated into a system prompt or a tool directive.
3. **Read-only tool allow-list.** The hand-rolled loop dispatches only over a static map of seven tools (`get_profile`, `search_jobs`, `read_posting`, `compare_to_profile`, `save_finding`, plus `recall_memory` / `remember` — see [Agent memory](#agent-memory-long-term)). There is no fetch-URL, email, or shell tool — the "lethal trifecta" (untrusted input + private data + external comms) is broken by construction. The only writes (`save_finding`, `remember`) are idempotent, schema-bounded upserts on the user's *own* data — never external comms — so adding memory doesn't widen the blast radius.
4. **Zod-validate every output.** Constrained decoding guarantees JSON *shape*, not *semantics*. Every model output and every tool-call argument passes a `z.strictObject` parse before it can touch the DB or a tool: strings are `.max()`-capped, numbers range-bounded (score 0–100, salary ≤ 5,000,000), sets are enums, and unknown keys are rejected. A poisoned completion ("set score to 999", a stuffed exfil URL) is dropped at this boundary.
5. **Bounded budgets.** Each agent run is capped by `DEFAULT_BUDGET` (`lib/agent/cost.ts`): 24 steps, 600k tokens, $1.00. `checkBudget()` runs before every model call and the loop terminates the instant a cap trips, so a hijacked loop can't run away.

**Regression suite.** `tests/fixtures/injection-corpus.ts` is a seeded corpus of adversarial postings (one per attack class). `tests/unit/injection.test.ts` asserts the deterministic guarantees offline (no API key, runs in `npm test`): spotlighting strips forged fences, the schemas reject poisoned output, and a canary token never reaches a structured field. Every bypass found in the wild becomes a permanent fixture here.

**Live red team (opt-in).** To measure how the *real model* responds to the corpus:

\`\`\`bash
npm run redteam                 # all fixtures (needs GROQ_API_KEY)
npm run redteam -- --limit 4    # cap requests to stay cheap / under quota
npm run redteam -- --only override-score-100,base64-payload
\`\`\`

It runs each attack through the real `extractPosting()`, prints a per-fixture table (model complied / ignored / rejected; attack succeeded / blocked) and an attack-success-rate, and exits non-zero if any attack gets through. It is deliberately **not** part of `npm test` so CI and Groq quota stay clean. Model compliance is probabilistic — the deterministic layers above are what actually bound the damage.

## Connect from Claude (MCP)

Hiring Radar ships an MCP server exposing 3 tools (`search_jobs`, `get_posting`, `manage_shortlist`), 2 resources (monthly digest, current shortlist), and 2 prompts (screen a posting, summarize the month).

### Local (stdio) — Claude Desktop / Claude Code

Runs the server as a local process with full `read_write` access. Add to `claude_desktop_config.json` (Settings -> Developer -> Edit Config):

```json
{
  "mcpServers": {
    "hiring-radar": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/hiring-radar"
    }
  }
}
```

`npm run mcp` loads `.env.local` (needs `DATABASE_URL`), so the radar must already be ingested + embedded.

### Remote (Streamable HTTP) — bearer auth

The deployed app serves the same surface at `POST /api/mcp`, gated by a bearer API key minted in Settings. Read-only keys can search/read; `manage_shortlist` requires a `read_write` key.

```bash
claude mcp add --transport http hiring-radar https://<your-host>/api/mcp \
  --header "Authorization: Bearer hrk_your_key_here"
```

A missing/invalid/revoked key returns 401; the endpoint is rate-limited.

### Inspect it

```bash
npx @modelcontextprotocol/inspector npm run mcp
```

opens the MCP Inspector against the local stdio server. `npm run mcp:smoke` is a headless integration check that spawns the stdio server and drives it with the SDK client (tools/list + live tool calls).

## Engineering conventions

The house style — architecture & data flow, the hard code rules (no `any`,
parse-before-trust, `server-only` data access, the `runAction`/`ActionError`
result pattern), AI/agent conventions (zod-on-LLM-output, spotlighting, cost
budgets), design-system rules, and commit/workflow discipline — lives in
[`AGENTS.md`](AGENTS.md). Read it before contributing; it's the same doc the
coding agents follow, and the enforced floor is `npm run lint`.
