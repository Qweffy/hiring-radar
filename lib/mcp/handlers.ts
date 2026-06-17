// NOTE: no "server-only" here — the stdio MCP CLI (scripts/mcp.ts, tsx) imports
// these handlers OUTSIDE the Next/React-server context, where a `server-only`
// import throws at load time (same constraint as lib/mcp/api-keys.ts and
// scripts/proxy.ts). So everything this module touches must also be free of the
// `server-only` guard: it reads `@/db` directly and reuses lib/search/engine.ts
// (also un-guarded), and replicates the few read shapes it needs with small
// direct Drizzle queries instead of importing lib/queries/* (which ARE
// server-only). The Streamable HTTP route IS in server context but shares these
// same handlers so both transports return byte-identical results.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  assessments,
  postings,
  shortlistEntries,
  type AssessmentReason,
  type ProfileSkills,
} from "@/db/schema";
import { type BrowseFilters } from "@/lib/browse-params";
import { type ApiKeyScope } from "@/lib/mcp/api-keys";
import { searchPostings } from "@/lib/search/engine";

/**
 * The radar's MCP tool layer. Each handler is Zod-validated at its boundary and
 * returns DATA — a typed success payload OR a structured {error} object — and
 * NEVER throws across the call. The transports (stdio + Streamable HTTP) wrap
 * whatever comes back into a CallToolResult; an `isError` result is just the
 * error payload serialized, so the client/model sees a clear, recoverable
 * message rather than a transport-level crash.
 *
 * Posting text is hostile input (docs/best-practices/ai-security.md). These are
 * AUTHENTICATED OWNER tools, not the agent prompt, so we don't spotlight-fence
 * the output here — the consumer is the key-holder's own Claude client, not an
 * untrusted model fanning out over scraped text. We DO cap rawText length so a
 * single posting can't blow the response budget.
 */

/* ── Tool argument schemas (mirror lib/agent/tool-schemas.ts strict style) ── */

export const searchJobsArgs = z.strictObject({
  query: z.string().trim().min(1).max(200),
  remote: z.enum(["remote", "hybrid", "onsite"]).optional(),
  salaryMin: z.number().int().min(0).max(5_000_000).optional(),
  stack: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export const getPostingArgs = z.strictObject({
  hnId: z.number().int().positive(),
});

export const manageShortlistArgs = z.strictObject({
  hnId: z.number().int().positive(),
  action: z.enum(["add", "remove"]),
});

export type SearchJobsArgs = z.infer<typeof searchJobsArgs>;
export type GetPostingArgs = z.infer<typeof getPostingArgs>;
export type ManageShortlistArgs = z.infer<typeof manageShortlistArgs>;

/** Raw Zod shapes for McpServer.registerTool's inputSchema (it wants a shape). */
export const searchJobsShape = searchJobsArgs.shape;
export const getPostingShape = getPostingArgs.shape;
export const manageShortlistShape = manageShortlistArgs.shape;

/* ── Structured tool errors — returned as data, never thrown. ── */

export interface ToolError {
  error: {
    type: "InputValidationError" | "NotFound" | "Forbidden" | "Internal";
    message: string;
  };
}

export function toolError(
  type: ToolError["error"]["type"],
  message: string,
): ToolError {
  return { error: { type, message } };
}

export function isToolError(value: unknown): value is ToolError {
  return typeof value === "object" && value !== null && "error" in value;
}

/* ── Defaults & caps. ── */

/** Default page size for search when the caller omits `limit`. */
const DEFAULT_SEARCH_LIMIT = 8;
/** Hard cap on a single posting's rawText in get_posting (chars). */
const RAW_TEXT_CAP = 6_000;
/** Resource: how many top postings the monthly digest lists. */
const DIGEST_TOP_N = 10;

/** Latest month with postings, e.g. "2026-06"; null until first ingest. */
async function latestMonth(): Promise<string | null> {
  const rows = await db
    .selectDistinct({ month: postings.month })
    .from(postings)
    .orderBy(sql`month desc`)
    .limit(1);
  return rows[0]?.month ?? null;
}

/** Compact "$120k" / "$120k-$160k" label, or null when no salary is stated. */
function salaryLabel(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min === null && max === null) return null;
  const cur = currency ?? "";
  const fmt = (n: number): string => `${cur}${String(Math.round(n / 1000))}k`.trim();
  if (min !== null && max !== null) {
    return min === max ? fmt(min) : `${fmt(min)}-${fmt(max)}`;
  }
  const one = min ?? max;
  return one === null ? null : fmt(one);
}

/* ── search_jobs ──────────────────────────────────────────────────────────
 * Hybrid retrieval (FTS + vector RRF) over the LATEST month, reusing the same
 * engine the Browse UI and the agent use, then hydrating compact card fields.
 */

export interface SearchHit {
  hnId: number;
  company: string | null;
  role: string | null;
  salary: string | null;
  stack: string[];
  /** Agent assessment score (0-100) when this posting was scored, else null. */
  matchScore: number | null;
}

export interface SearchJobsResult {
  month: string;
  count: number;
  results: SearchHit[];
}

export async function searchJobs(
  args: SearchJobsArgs,
): Promise<SearchJobsResult | ToolError> {
  const month = await latestMonth();
  if (month === null) {
    return toolError("NotFound", "No postings have been ingested for any month yet.");
  }

  const limit = args.limit ?? DEFAULT_SEARCH_LIMIT;
  const filters: BrowseFilters = {
    q: args.query,
    mode: "hybrid",
    remote: args.remote ? [args.remote] : [],
    salaryMin: args.salaryMin ?? null,
    stack: args.stack ?? [],
    visa: false,
    matchMin: null,
    month,
    page: 1,
    selected: null,
  };

  const { ids } = await searchPostings(filters, month, limit, 0);
  if (ids.length === 0) {
    return { month, count: 0, results: [] };
  }

  const rows = await db
    .select({
      id: postings.id,
      hnId: postings.hnId,
      company: postings.company,
      role: postings.role,
      salaryMin: postings.salaryMin,
      salaryMax: postings.salaryMax,
      salaryCurrency: postings.salaryCurrency,
      stackTags: postings.stackTags,
      matchScore: assessments.score,
    })
    .from(postings)
    .leftJoin(assessments, eq(assessments.postingId, postings.id))
    .where(inArray(postings.id, ids));

  // searchPostings returns ids in ranked order; preserve it.
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((r): r is (typeof rows)[number] => r !== undefined);

  const results: SearchHit[] = ordered.map((r) => ({
    hnId: r.hnId,
    company: r.company,
    role: r.role,
    salary: salaryLabel(r.salaryMin, r.salaryMax, r.salaryCurrency),
    stack: r.stackTags ?? [],
    matchScore: r.matchScore,
  }));

  return { month, count: results.length, results };
}

/* ── get_posting ──────────────────────────────────────────────────────────
 * Full parsed fields + a length-capped rawText for one posting by its HN id.
 */

export interface PostingResult {
  hnId: number;
  author: string;
  month: string;
  company: string | null;
  role: string | null;
  location: string | null;
  companyStage: string | null;
  remotePolicy: "remote" | "hybrid" | "onsite" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryRaw: string | null;
  stackTags: string[];
  visaSponsorship: boolean | null;
  contact: string | null;
  matchScore: number | null;
  matchReasons: AssessmentReason[] | null;
  /** Posting body, truncated to RAW_TEXT_CAP chars (see `rawTextTruncated`). */
  rawText: string;
  rawTextTruncated: boolean;
}

export async function getPosting(
  args: GetPostingArgs,
): Promise<PostingResult | ToolError> {
  const rows = await db
    .select({
      hnId: postings.hnId,
      author: postings.author,
      month: postings.month,
      company: postings.company,
      role: postings.role,
      location: postings.location,
      companyStage: postings.companyStage,
      remotePolicy: postings.remotePolicy,
      salaryMin: postings.salaryMin,
      salaryMax: postings.salaryMax,
      salaryCurrency: postings.salaryCurrency,
      salaryRaw: postings.salaryRaw,
      stackTags: postings.stackTags,
      visaSponsorship: postings.visaSponsorship,
      contact: postings.contact,
      rawText: postings.rawText,
      matchScore: assessments.score,
      matchReasons: assessments.reasons,
    })
    .from(postings)
    .leftJoin(assessments, eq(assessments.postingId, postings.id))
    .where(eq(postings.hnId, args.hnId))
    .limit(1);

  const r = rows[0];
  if (!r) {
    return toolError("NotFound", `No posting found with hnId ${String(args.hnId)}.`);
  }

  const truncated = r.rawText.length > RAW_TEXT_CAP;
  return {
    hnId: r.hnId,
    author: r.author,
    month: r.month,
    company: r.company,
    role: r.role,
    location: r.location,
    companyStage: r.companyStage,
    remotePolicy: r.remotePolicy,
    salaryMin: r.salaryMin,
    salaryMax: r.salaryMax,
    salaryCurrency: r.salaryCurrency,
    salaryRaw: r.salaryRaw,
    stackTags: r.stackTags ?? [],
    visaSponsorship: r.visaSponsorship,
    contact: r.contact,
    matchScore: r.matchScore,
    matchReasons: r.matchReasons,
    rawText: truncated ? r.rawText.slice(0, RAW_TEXT_CAP) : r.rawText,
    rawTextTruncated: truncated,
  };
}

/* ── manage_shortlist ───────────────────────────────────────────────────────
 * Add/remove a MANUAL shortlist entry for a posting. Write tool — requires the
 * 'read_write' scope; a 'read' key gets a structured Forbidden error. neon-http
 * has no transactions, so add is an idempotent upsert keyed on the posting's
 * unique index and remove is a single scoped delete (matching the repo's
 * shortlist-writes.ts discipline, replicated here to stay server-only-free).
 */

export interface ManageShortlistResult {
  hnId: number;
  action: "add" | "remove";
  /** True when the row exists after the call (add → true, remove → false). */
  shortlisted: boolean;
  /** True when this call actually changed the table (vs. a no-op idempotent hit). */
  changed: boolean;
}

export async function manageShortlist(
  args: ManageShortlistArgs,
  scope: ApiKeyScope,
): Promise<ManageShortlistResult | ToolError> {
  if (scope !== "read_write") {
    return toolError(
      "Forbidden",
      "manage_shortlist requires a read_write API key. This key is read-only.",
    );
  }

  const postingRows = await db
    .select({ id: postings.id })
    .from(postings)
    .where(eq(postings.hnId, args.hnId))
    .limit(1);

  const posting = postingRows[0];
  if (!posting) {
    return toolError("NotFound", `No posting found with hnId ${String(args.hnId)}.`);
  }

  if (args.action === "add") {
    // Idempotent insert keyed on the unique postingId index — re-adding an
    // existing entry is a no-op (onConflictDoNothing), never a double-write.
    const inserted = await db
      .insert(shortlistEntries)
      .values({ postingId: posting.id, source: "manual" })
      .onConflictDoNothing({ target: shortlistEntries.postingId })
      .returning({ id: shortlistEntries.id });
    return {
      hnId: args.hnId,
      action: "add",
      shortlisted: true,
      changed: inserted.length > 0,
    };
  }

  // remove — single scoped delete; notes cascade via the FK.
  const deleted = await db
    .delete(shortlistEntries)
    .where(eq(shortlistEntries.postingId, posting.id))
    .returning({ id: shortlistEntries.id });
  return {
    hnId: args.hnId,
    action: "remove",
    shortlisted: false,
    changed: deleted.length > 0,
  };
}

/* ── Resource: monthly digest ──────────────────────────────────────────────
 * A snapshot of the latest month — totals, new count, and the strongest
 * postings (agent-scored first, then most recent) — for an at-a-glance brief.
 */

export interface DigestTopPosting {
  hnId: number;
  company: string | null;
  role: string | null;
  salary: string | null;
  matchScore: number | null;
}

export interface MonthlyDigest {
  month: string | null;
  totalPostings: number;
  newThisMonth: number;
  assessedCount: number;
  topPostings: DigestTopPosting[];
}

export async function getMonthlyDigest(): Promise<MonthlyDigest> {
  const month = await latestMonth();
  if (month === null) {
    return {
      month: null,
      totalPostings: 0,
      newThisMonth: 0,
      assessedCount: 0,
      topPostings: [],
    };
  }

  const inMonth = and(
    eq(postings.month, month),
    sql`${postings.parseStatus} <> 'skipped'`,
    eq(postings.isDeleted, false),
  );

  const [aggRows, newRows, topRows] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        assessed: sql<number>`count(*) filter (where ${assessments.score} is not null)::int`,
      })
      .from(postings)
      .leftJoin(assessments, eq(assessments.postingId, postings.id))
      .where(inMonth),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(postings)
      .where(and(inMonth, sql`${postings.lastSeenAt} >= now() - interval '24 hours'`)),
    db
      .select({
        hnId: postings.hnId,
        company: postings.company,
        role: postings.role,
        salaryMin: postings.salaryMin,
        salaryMax: postings.salaryMax,
        salaryCurrency: postings.salaryCurrency,
        matchScore: assessments.score,
      })
      .from(postings)
      .leftJoin(assessments, eq(assessments.postingId, postings.id))
      .where(inMonth)
      // Scored postings first (highest score), then most recent. nulls last.
      .orderBy(sql`${assessments.score} desc nulls last`, desc(postings.hnCreatedAt))
      .limit(DIGEST_TOP_N),
  ]);

  const agg = aggRows[0] ?? { total: 0, assessed: 0 };
  const topPostings: DigestTopPosting[] = topRows.map((r) => ({
    hnId: r.hnId,
    company: r.company,
    role: r.role,
    salary: salaryLabel(r.salaryMin, r.salaryMax, r.salaryCurrency),
    matchScore: r.matchScore,
  }));

  return {
    month,
    totalPostings: agg.total,
    newThisMonth: newRows[0]?.n ?? 0,
    assessedCount: agg.assessed,
    topPostings,
  };
}

/* ── Resource: current shortlist ────────────────────────────────────────────
 * Every shortlisted posting (agent + manual), newest-updated first, with the
 * fields a client needs to reason about the pipeline.
 */

export interface ShortlistResourceItem {
  hnId: number;
  company: string | null;
  role: string | null;
  salary: string | null;
  stage: "new" | "applied" | "interviewing" | "offer" | "archived";
  source: "agent" | "manual";
  matchScore: number | null;
}

export async function getShortlistResource(): Promise<ShortlistResourceItem[]> {
  const rows = await db
    .select({
      hnId: postings.hnId,
      company: postings.company,
      role: postings.role,
      salaryMin: postings.salaryMin,
      salaryMax: postings.salaryMax,
      salaryCurrency: postings.salaryCurrency,
      stage: shortlistEntries.stage,
      source: shortlistEntries.source,
      matchScore: assessments.score,
    })
    .from(shortlistEntries)
    .innerJoin(postings, eq(postings.id, shortlistEntries.postingId))
    .leftJoin(assessments, eq(assessments.postingId, shortlistEntries.postingId))
    .orderBy(desc(shortlistEntries.updatedAt));

  return rows.map((r) => ({
    hnId: r.hnId,
    company: r.company,
    role: r.role,
    salary: salaryLabel(r.salaryMin, r.salaryMax, r.salaryCurrency),
    stage: r.stage,
    source: r.source,
    matchScore: r.matchScore,
  }));
}

/* ── Prompt payloads ────────────────────────────────────────────────────────
 * Two reusable prompts. They emit ARGUMENT-INTERPOLATED user-message text only;
 * no posting text is embedded here (the client fetches it via get_posting). The
 * profile-screening prompt reads the latest saved profile so the brief is
 * grounded, and degrades gracefully when no profile exists yet.
 */

export interface ProfileBrief {
  summary: string | null;
  skills: ProfileSkills | null;
  targetRoles: string[];
  salaryFloor: number | null;
  remotePref: "remote_only" | "hybrid_ok" | "any" | null;
  dealbreakers: string[];
}

export async function getProfileBrief(): Promise<ProfileBrief | null> {
  const rows = await db
    .select({
      summary: sql<string | null>`summary`,
      skills: sql<ProfileSkills | null>`skills`,
      targetRoles: sql<string[] | null>`target_roles`,
      salaryFloor: sql<number | null>`salary_floor`,
      remotePref: sql<
        "remote_only" | "hybrid_ok" | "any" | null
      >`remote_pref`,
      dealbreakers: sql<string[] | null>`dealbreakers`,
    })
    .from(sql`profiles`)
    .orderBy(sql`version desc`)
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  return {
    summary: r.summary,
    skills: r.skills,
    targetRoles: r.targetRoles ?? [],
    salaryFloor: r.salaryFloor,
    remotePref: r.remotePref,
    dealbreakers: r.dealbreakers ?? [],
  };
}
