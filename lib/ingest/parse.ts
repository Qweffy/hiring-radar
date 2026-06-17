// Per-posting parse + embed primitives, shared by the Inngest processPosting
// function. Each function does exactly one side effect and returns a small
// JSON-serialisable result so it maps cleanly onto a single Inngest step.
// No "server-only" guard — kept import-safe for tsx and the Node server runtime.
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { postingEmbeddings, postings } from "@/db/schema";
import { embed, EMBEDDING_MODEL } from "@/lib/embeddings";
import { extractPosting, extractionModel } from "@/lib/llm/extract";
import { normalizePosting } from "@/lib/llm/normalize";

/** True when an error is a provider rate-limit (HTTP 429 / "rate limit"). */
export function isRateLimited(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || /rate limit/i.test(message);
}

export type ParseOutcome =
  | { kind: "parsed"; company: string | null; role: string | null }
  | { kind: "skipped" }
  | { kind: "gone" };

interface PostingRow {
  id: number;
  hnId: number;
  rawText: string;
  isDeleted: boolean;
  parseStatus: "pending" | "parsed" | "failed" | "skipped";
}

async function loadPosting(postingId: number): Promise<PostingRow | null> {
  const rows = await db
    .select({
      id: postings.id,
      hnId: postings.hnId,
      rawText: postings.rawText,
      isDeleted: postings.isDeleted,
      parseStatus: postings.parseStatus,
    })
    .from(postings)
    .where(eq(postings.id, postingId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Parse one posting through Groq and persist the result. The caller wraps this
 * in a single step.run; on a 429 we re-throw so the step retries with
 * RetryAfterError, on a deterministic parse failure we mark the row failed and
 * re-throw so onFailure dead-letters it. Idempotent: re-running a parsed posting
 * just overwrites the same fields.
 */
export async function parsePosting(postingId: number): Promise<ParseOutcome> {
  const row = await loadPosting(postingId);
  if (!row || row.isDeleted) return { kind: "gone" };

  const extracted = normalizePosting(await extractPosting(row.rawText));
  const model = extractionModel();

  if (!extracted.isJobPosting) {
    await db
      .update(postings)
      .set({
        parseStatus: "skipped",
        parsedAt: new Date(),
        parseModel: model,
        parseError: null,
        updatedAt: new Date(),
      })
      .where(eq(postings.id, row.id));
    return { kind: "skipped" };
  }

  await db
    .update(postings)
    .set({
      parseStatus: "parsed",
      parsedAt: new Date(),
      parseModel: model,
      parseError: null,
      company: extracted.company,
      role: extracted.role,
      location: extracted.location,
      companyStage: extracted.companyStage,
      remotePolicy: extracted.remotePolicy,
      salaryMin: extracted.salaryMin,
      salaryMax: extracted.salaryMax,
      salaryCurrency: extracted.salaryCurrency,
      salaryRaw: extracted.salaryRaw,
      stackTags: extracted.stackTags,
      visaSponsorship: extracted.visaSponsorship,
      contact: extracted.contact,
      updatedAt: new Date(),
    })
    .where(eq(postings.id, row.id));

  return { kind: "parsed", company: extracted.company, role: extracted.role };
}

/** Record a deterministic parse failure on the posting row (pre-dead-letter). */
export async function markParseFailed(
  postingId: number,
  message: string,
): Promise<void> {
  await db
    .update(postings)
    .set({
      parseStatus: "failed",
      parseError: message.slice(0, 500),
      parseModel: extractionModel(),
      updatedAt: new Date(),
    })
    .where(eq(postings.id, postingId));
}

export type EmbedOutcome = { kind: "embedded" } | { kind: "skipped" } | { kind: "gone" };

/**
 * Embed one posting and upsert its vector. Only parsed postings are embedded
 * (skipped/deleted carry no signal). Gated on contentHash by the unique
 * posting_id row — re-running overwrites in place. The embedding input mirrors
 * the tsvector source so lexical and vector branches see the same fields.
 */
export async function embedPosting(postingId: number): Promise<EmbedOutcome> {
  const rows = await db
    .select({
      id: postings.id,
      contentHash: postings.contentHash,
      company: postings.company,
      role: postings.role,
      location: postings.location,
      rawText: postings.rawText,
      isDeleted: postings.isDeleted,
      parseStatus: postings.parseStatus,
    })
    .from(postings)
    .where(eq(postings.id, postingId))
    .limit(1);
  const p = rows[0];
  if (!p || p.isDeleted) return { kind: "gone" };
  if (p.parseStatus === "skipped") return { kind: "skipped" };

  const input = [p.company ?? "", p.role ?? "", p.location ?? "", p.rawText]
    .filter((s) => s.length > 0)
    .join("\n")
    .trim();

  const vector = await embed(input);

  await db
    .insert(postingEmbeddings)
    .values({
      postingId: p.id,
      contentHash: p.contentHash,
      model: EMBEDDING_MODEL,
      embedding: vector,
    })
    .onConflictDoUpdate({
      target: postingEmbeddings.postingId,
      set: {
        contentHash: p.contentHash,
        model: EMBEDDING_MODEL,
        embedding: vector,
        createdAt: new Date(),
      },
    });

  return { kind: "embedded" };
}
