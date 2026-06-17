import "./env";
import { and, eq, ne, not, sql } from "drizzle-orm";

import { db } from "@/db";
import { postingEmbeddings, postings } from "@/db/schema";
import { embedBatch, EMBEDDING_DIMS, EMBEDDING_MODEL } from "@/lib/embeddings";

/* ------------------------------------------------------------------ */
/* CLI args                                                             */
/* ------------------------------------------------------------------ */

type Args = {
  month: string | null;
  limit: number | null;
  batchSize: number;
  force: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] ?? null : null;
  };
  return {
    month: get("--month"),
    limit: get("--limit") ? Number(get("--limit")) : null,
    batchSize: Number(get("--batch") ?? 32),
    force: argv.includes("--force"),
  };
}

/* ------------------------------------------------------------------ */
/* Embedding input — what text goes into the model.                     */
/* Mirror the tsvector source so lexical and vector branches see the    */
/* same fields; rawText carries the bulk of the signal.                 */
/* ------------------------------------------------------------------ */

function embedInput(p: {
  company: string | null;
  role: string | null;
  location: string | null;
  rawText: string;
}): string {
  return [p.company ?? "", p.role ?? "", p.location ?? "", p.rawText]
    .filter((s) => s.length > 0)
    .join("\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

type Candidate = {
  id: number;
  hnId: number;
  contentHash: string;
  company: string | null;
  role: string | null;
  location: string | null;
  rawText: string;
};

async function loadCandidates(args: Args): Promise<Candidate[]> {
  // Every non-deleted, non-skipped posting whose embedding is missing OR whose
  // stored contentHash differs from the posting's current contentHash. A LEFT
  // JOIN exposes the stored hash; --force re-embeds everything regardless.
  const conds = [ne(postings.parseStatus, "skipped"), not(postings.isDeleted)];
  if (args.month) conds.push(eq(postings.month, args.month));
  if (!args.force) {
    conds.push(
      sql`(${postingEmbeddings.id} is null or ${postingEmbeddings.contentHash} <> ${postings.contentHash})`,
    );
  }

  const rows = await db
    .select({
      id: postings.id,
      hnId: postings.hnId,
      contentHash: postings.contentHash,
      company: postings.company,
      role: postings.role,
      location: postings.location,
      rawText: postings.rawText,
    })
    .from(postings)
    .leftJoin(postingEmbeddings, eq(postingEmbeddings.postingId, postings.id))
    .where(and(...conds))
    .orderBy(postings.id)
    .limit(args.limit ?? 100_000);

  return rows;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const startedAt = Date.now();
  console.log(
    `embed: model=${EMBEDDING_MODEL} dims=${EMBEDDING_DIMS} batch=${args.batchSize}` +
      `${args.month ? ` month=${args.month}` : ""}` +
      `${args.limit ? ` limit=${args.limit}` : ""}` +
      `${args.force ? " (force)" : ""}`,
  );

  const candidates = await loadCandidates(args);
  const total = candidates.length;
  if (total === 0) {
    console.log("nothing to embed — all postings already up to date");
    return;
  }
  console.log(`${total} postings need embedding`);

  let embedded = 0;
  let failed = 0;

  for (let i = 0; i < total; i += args.batchSize) {
    const batch = candidates.slice(i, i + args.batchSize);
    const inputs = batch.map(embedInput);

    let vectors: number[][];
    try {
      vectors = await embedBatch(inputs);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      failed += batch.length;
      console.log(
        `[${i + batch.length}/${total}] batch FAILED — ${message.slice(0, 160)}`,
      );
      continue;
    }

    // neon-http has no transactions; upsert each row independently. One
    // embedding row per posting (unique on posting_id) → onConflict update.
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const vector = vectors[j];
      if (!row || !vector) {
        failed++;
        continue;
      }
      try {
        await db
          .insert(postingEmbeddings)
          .values({
            postingId: row.id,
            contentHash: row.contentHash,
            model: EMBEDDING_MODEL,
            embedding: vector,
          })
          .onConflictDoUpdate({
            target: postingEmbeddings.postingId,
            set: {
              contentHash: row.contentHash,
              model: EMBEDDING_MODEL,
              embedding: vector,
              createdAt: new Date(),
            },
          });
        embedded++;
      } catch (e) {
        failed++;
        const message = e instanceof Error ? e.message : String(e);
        console.log(`  upsert FAILED hn-${row.hnId} — ${message.slice(0, 120)}`);
      }
    }

    const done = Math.min(i + args.batchSize, total);
    console.log(`[${done}/${total}] embedded ${embedded} · failed ${failed}`);
  }

  const mins = ((Date.now() - startedAt) / 60_000).toFixed(2);
  console.log(
    `\nembed done in ${mins}min — model ${EMBEDDING_MODEL} (${EMBEDDING_DIMS}d) · embedded ${embedded} · failed ${failed} · total ${total}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
