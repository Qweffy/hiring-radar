# Drizzle ORM + Neon Postgres — Best Practices
> Researched 2026-06-10. Sources verified against current official docs.

## TL;DR
- Default driver for all app/API code: `drizzle-orm/neon-http` over Neon's SQL-over-HTTP — fastest for one-shot serverless queries.
- Need a real (interactive) transaction? Use `drizzle-orm/neon-serverless` (WebSocket `Pool`) for that code path only; create and end the pool inside the handler.
- `db.transaction()` throws at runtime on neon-http. Use `db.batch()` (atomic, non-interactive) or the WS driver.
- Migrations: `drizzle-kit generate` → commit SQL → `drizzle-kit migrate`, always against the **unpooled** URL. `push` only against throwaway Neon dev branches.
- Two env vars: `DATABASE_URL` (pooled, `-pooler` host) for runtime; `DATABASE_URL_UNPOOLED` (direct) for drizzle-kit and session-level features.
- Develop against a Neon branch, never main. Reset the branch to parent instead of reseeding.

## Practices

**Use `neon-http` as the default db client.** HTTP queries skip TCP/TLS handshakes entirely — fastest option for single, non-interactive queries from serverless functions (Vercel, Inngest steps). One module-level instance is safe; HTTP is stateless, so there is no connection to leak. [orm.drizzle.team/docs/connect-neon](https://orm.drizzle.team/docs/connect-neon)
```ts
// src/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
```

**Switch to the WebSocket driver only where you need interactive transactions** (read → decide → write in one tx, e.g. multi-step ingestion writes). Scope the `Pool` to the request: "WebSocket connections cannot outlive a single request" in serverless — create it in the handler, `await pool.end()` in `finally`. On Node < 22 set `neonConfig.webSocketConstructor = ws` (`ws` package); Node 22+ has native WebSocket. [neon.com/docs/serverless/serverless-driver](https://neon.com/docs/serverless/serverless-driver)
```ts
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle({ client: pool, schema });
try {
  await db.transaction(async (tx) => { /* interactive steps */ });
} finally {
  await pool.end();
}
```

**Prefer `db.batch()` over transactions where the statements are independent.** On neon-http, `db.batch([...])` runs as a single non-interactive transaction (all-or-nothing) in one round trip — ideal for "insert posting + insert embedding" pairs during ingestion. For idempotent ingestion, prefer `onConflictDoUpdate` upserts over transactions entirely. [orm.drizzle.team/docs/batch-api](https://orm.drizzle.team/docs/batch-api)

**Migrations: `generate` + `migrate`, never `push`, on any branch you care about.** `drizzle-kit generate` emits versioned SQL you commit and review; `drizzle-kit migrate` applies it (tracked in `drizzle.__drizzle_migrations`). Run migrate in CI or a predeploy step. `push` is for rapid prototyping against a disposable Neon dev branch only — mixing push and migrate histories on the same database desyncs the journal. [orm.drizzle.team/docs/migrations](https://orm.drizzle.team/docs/migrations)

**Point drizzle-kit at the unpooled URL.** Schema migrations need a direct connection — PgBouncer in transaction mode does not support session-level features (advisory locks, `SET`, temp tables, `CREATE INDEX CONCURRENTLY`, `LISTEN/NOTIFY`). Pooled host contains `-pooler`; direct does not. [neon.com/docs/connect/choose-connection](https://neon.com/docs/connect/choose-connection)
```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});
```

**Organize schema as a folder, one file per domain.** `src/db/schema/{threads,postings,embeddings}.ts` + `index.ts` barrel re-exporting everything (drizzle-kit needs every table exported; pointing `schema` at the folder picks them all up). Use the current array-form third argument for indexes — the object form is deprecated. pgvector columns are first-class: `vector("embedding", { dimensions: 384 })` with `index().using("hnsw", t.embedding.op("vector_cosine_ops"))`. [orm.drizzle.team/docs/sql-schema-declaration](https://orm.drizzle.team/docs/sql-schema-declaration)

**Declare both FK constraints and Drizzle relations.** `.references()` in the table definition creates the real database FK; the `relations()` helper (separate, app-level) powers `db.query.*.findMany({ with: ... })`. They are independent — define both. Stay on the v1 `relations()` API; `defineRelations`/RQB v2 ships with drizzle-orm 1.0, still RC. [orm.drizzle.team/docs/relations-v2](https://orm.drizzle.team/docs/relations-v2)

**Branch-per-environment on Neon.** Keep `main` as production; create a long-lived `dev` branch for local work (`neonctl branches create --name dev`) and point `.env.local` at it. Reset to parent (`neonctl branches reset dev --parent`) instead of reseeding. Enable the Neon Vercel integration for an isolated branch per preview deploy; set branch expiration (TTL) on ephemeral branches. Branches are copy-on-write — instant and ~free. [neon.com/docs/guides/branching-intro](https://neon.com/docs/guides/branching-intro)

## Pitfalls
- **`db.transaction()` on neon-http compiles fine and throws at runtime.** The type system will not save you. Either `db.batch()` or the WS driver.
- **Cold starts:** Neon scales compute to zero after 5 min idle (free/default). First query pays 300ms–1s. Acceptable here; if not, raise/disable the suspend timeout in the console. Don't "fix" it with keep-alive pings from serverless — you'll just pay for compute. [neon.com/docs/connect/connection-pooling](https://neon.com/docs/connect/connection-pooling)
- **Connection limits:** direct connections cap at `max_connections` (~100 on small computes); the pooler handles up to 10,000. Long-running scripts (seeds, backfills) using `pg` should use the pooled URL or close connections promptly.
- **No client-side pooling in serverless.** `pg.Pool` with min connections, or module-level WS pools, leak across invocations. Avoid double pooling (client pool + PgBouncer).
- **Stale tutorial patterns to reject:** `driver: "pg"` in drizzle.config (now `dialect: "postgresql"`, drizzle-kit ≥ 0.21); `neonConfig.fetchConnectionCache = true` (default since v0.10, option removed in v1); pgTable third argument returning an object (deprecated — return an array); `drizzle(sql, { schema })` positional form (still works, but object form `drizzle({ client, schema })` is current).
- **Running drizzle-kit through the pooler** — DDL may hang or fail on session features. Always the unpooled URL.
- **`WebSocket is not defined`** on Node < 22 → you forgot `neonConfig.webSocketConstructor = ws`.

## Version notes
Current as of June 2026 (npm `latest`):
- `drizzle-orm@0.45.2` — stable line; relations v1 API, neon-http/neon-serverless drivers, native pgvector types.
- `drizzle-kit@0.31.10` — `generate`/`migrate`/`push`/`studio`; config via `defineConfig`, `dialect: "postgresql"` required.
- `@neondatabase/serverless@1.1.0` — v1.x is current (1.0 landed April 2025); pre-1.0 config flags from old posts no longer exist.
- `ws@8.x` — only needed for the WS driver on Node < 22.

drizzle-orm/drizzle-kit **1.0.0-rc.3** is on the `rc` tag (RC since April 2026): RQB v2, `defineRelations`, JIT mappers, Effect support. Do not adopt for this build — wait for stable; the v1→v2 relations migration is incremental ([orm.drizzle.team/docs/relations-v1-v2](https://orm.drizzle.team/docs/relations-v1-v2)).

Install:
```bash
npm i drizzle-orm @neondatabase/serverless
npm i -D drizzle-kit
```
```

## Structured output (to return now)
- topic: Drizzle ORM + Neon Postgres
- filePath: /Users/nicomastakas/Desktop/repos/Learn-AI/hiring-radar/docs/best-practices/drizzle-neon.md (pending write — blocked by plan mode)
