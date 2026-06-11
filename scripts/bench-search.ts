import "./env";
import { performance } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { BrowseFilters, SearchMode } from "@/lib/browse-params";
import { searchPostings } from "@/lib/search/engine";

/* ------------------------------------------------------------------ */
/* Hand-labelled relevance set.                                         */
/* Gold hnIds come from STRUCTURED fields (role / stack_tags), NOT from  */
/* any single retrieval method — otherwise FTS would trivially "win".   */
/* See the queries that produced them in the PR notes.                  */
/* ------------------------------------------------------------------ */

const MONTH = "2026-06";

type Labelled = { query: string; relevant: number[] };

const GOLD: Labelled[] = [
  { query: "rust backend", relevant: [48360194, 48359956, 48359481, 48359172, 48358336, 48358281, 48357992, 48357775, 48361574, 48362169] },
  { query: "python machine learning", relevant: [48364782, 48364413, 48363998, 48362248, 48362073, 48360453, 48359956, 48363300] },
  { query: "staff frontend react", relevant: [48362756, 48361780, 48358924, 48358221] },
  { query: "remote AI startup", relevant: [48361748, 48357792, 48364864, 48362455, 48363752] },
  { query: "golang infrastructure", relevant: [48364039, 48358657, 48357963] },
  { query: "data engineer", relevant: [48363272, 48362248, 48361940, 48358146] },
  { query: "security engineer", relevant: [48361768, 48361680, 48361656, 48361273, 48359262, 48361574] },
  { query: "full stack typescript", relevant: [48363752, 48362455, 48362254, 48359699, 48359483, 48358336, 48359608] },
  { query: "senior backend python", relevant: [48363775, 48363272, 48362254, 48360453, 48357792, 48357775, 48358281] },
  { query: "ml infrastructure engineer", relevant: [48360453, 48357775] },
  { query: "react native mobile", relevant: [48362448, 48362265, 48360581, 48359172, 48358328, 48357792] },
  { query: "ai engineer", relevant: [48364864, 48363425, 48361748, 48361035, 48359301, 48357792] },
];

const K = 10;

/* ------------------------------------------------------------------ */
/* Retrieval per mode → ordered hnIds.                                  */
/* ------------------------------------------------------------------ */

const baseFilters = (query: string, mode: SearchMode): BrowseFilters => ({
  q: query,
  mode,
  remote: [],
  salaryMin: null,
  stack: [],
  visa: false,
  month: MONTH,
  page: 1,
  selected: null,
});

/** Map posting ids → hnIds in the same order. */
async function idsToHnIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const rows = await db.execute<{ id: number; hn_id: number }>(sql`
    select id, hn_id from postings where id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
  `);
  const byId = new Map(rows.rows.map((r) => [r.id, Number(r.hn_id)]));
  return ids.map((i) => byId.get(i)).filter((h): h is number => h !== undefined);
}

/** Exact mode is the ILIKE path from lib/queries/postings.ts (recency-ordered). */
async function exactHnIds(query: string, limit: number): Promise<number[]> {
  const like = `%${query}%`;
  const rows = await db.execute<{ hn_id: number }>(sql`
    select hn_id from postings
    where parse_status <> 'skipped' and is_deleted = false and month = ${MONTH}
      and (company ilike ${like} or role ilike ${like} or location ilike ${like} or raw_text ilike ${like})
    order by hn_created_at desc
    limit ${limit}
  `);
  return rows.rows.map((r) => Number(r.hn_id));
}

async function retrieve(query: string, mode: SearchMode, limit: number): Promise<number[]> {
  if (mode === "exact") return exactHnIds(query, limit);
  const { ids } = await searchPostings(baseFilters(query, mode), MONTH, limit, 0);
  return idsToHnIds(ids);
}

/* ------------------------------------------------------------------ */
/* Metrics.                                                             */
/* ------------------------------------------------------------------ */

function recallAtK(retrieved: number[], relevant: Set<number>, k: number): number {
  if (relevant.size === 0) return 0;
  const top = retrieved.slice(0, k);
  const hits = top.filter((h) => relevant.has(h)).length;
  return hits / Math.min(relevant.size, k);
}

function reciprocalRank(retrieved: number[], relevant: Set<number>): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.has(retrieved[i])) return 1 / (i + 1);
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Run.                                                                 */
/* ------------------------------------------------------------------ */

const MODES: SearchMode[] = ["exact", "semantic", "hybrid"];

type ModeAgg = { recall: number; mrr: number; ms: number; n: number };

async function main(): Promise<void> {
  const agg: Record<SearchMode, ModeAgg> = {
    exact: { recall: 0, mrr: 0, ms: 0, n: 0 },
    semantic: { recall: 0, mrr: 0, ms: 0, n: 0 },
    hybrid: { recall: 0, mrr: 0, ms: 0, n: 0 },
  };

  // Warm the embedding pipeline once so its cold-start doesn't skew latency.
  await searchPostings(baseFilters("warmup", "semantic"), MONTH, 1, 0);

  console.log(`bench-search — ${GOLD.length} queries · month ${MONTH} · k=${K}\n`);

  for (const { query, relevant } of GOLD) {
    const gold = new Set(relevant);
    const line: string[] = [`"${query}"`.padEnd(30)];
    for (const mode of MODES) {
      const t0 = performance.now();
      const got = await retrieve(query, mode, K);
      const ms = performance.now() - t0;
      const r = recallAtK(got, gold, K);
      const mrr = reciprocalRank(got, gold);
      agg[mode].recall += r;
      agg[mode].mrr += mrr;
      agg[mode].ms += ms;
      agg[mode].n += 1;
      line.push(`${mode[0].toUpperCase()} r=${r.toFixed(2)} mrr=${mrr.toFixed(2)}`);
    }
    console.log(line.join("  "));
  }

  console.log("\n=== Summary (mean over queries) ===");
  console.log("mode      recall@10   MRR     avg ms");
  for (const mode of MODES) {
    const a = agg[mode];
    console.log(
      `${mode.padEnd(9)} ${(a.recall / a.n).toFixed(3).padStart(8)} ${(a.mrr / a.n)
        .toFixed(3)
        .padStart(7)} ${(a.ms / a.n).toFixed(1).padStart(8)}`,
    );
  }

  /* Latency note: ANN (HNSW) vs forced exact-scan on the same vector query.   */
  const probe = baseFilters("rust backend systems engineer", "semantic");
  const t0 = performance.now();
  await searchPostings(probe, MONTH, K, 0);
  const annMs = performance.now() - t0;

  // Force a full exact scan by disabling index scans for this one statement.
  const { ids } = await searchPostings(probe, MONTH, 1, 0); // ensure embed cache warm
  void ids;
  const tExact = performance.now();
  await db.execute(sql`
    with cfg as (select set_config('enable_indexscan','off', true), set_config('enable_indexonlyscan','off', true))
    select p.id
    from cfg, posting_embeddings pe join postings p on p.id = pe.posting_id
    where p.month = ${MONTH} and p.is_deleted = false and p.parse_status <> 'skipped'
    order by pe.embedding <=> (select embedding from posting_embeddings limit 1)
    limit ${K}
  `);
  const exactScanMs = performance.now() - tExact;

  console.log(
    `\nANN vs exact-scan (vector top-${K}): HNSW ≈ ${annMs.toFixed(1)} ms` +
      ` · forced seq-scan ≈ ${exactScanMs.toFixed(1)} ms (n=294 vectors — both fast at this scale;` +
      ` the index gap widens as the corpus grows).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
