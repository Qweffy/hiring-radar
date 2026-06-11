import "server-only";
import {
  and,
  arrayOverlaps,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { postings } from "@/db/schema";
import type { BrowseFilters } from "@/lib/browse-params";
import { getAvailableMonths, getLatestCompletedSweepId } from "@/lib/queries/sweeps";
import { searchPostings } from "@/lib/queries/search";

export const PAGE_SIZE = 50;

export type PostingRow = {
  id: number;
  hnId: number;
  company: string | null;
  role: string | null;
  location: string | null;
  remotePolicy: "remote" | "hybrid" | "onsite" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  stackTags: string[];
  hnCreatedAt: Date;
  isNew: boolean;
  parseStatus: "pending" | "parsed" | "failed" | "skipped";
  /** First raw-text line — the fallback title for unparsed rows. */
  rawTextPreview: string;
  /**
   * Best-matching ~140-char window of raw text for semantic/hybrid results,
   * with matched query terms wrapped in <mark>. Absent for exact mode.
   */
  relevanceSnippet?: string;
};

export type BrowseResult = {
  rows: PostingRow[];
  total: number;
  totalInMonth: number;
  page: number;
  pageSize: number;
  month: string | null;
  availableMonths: string[];
  availableStacks: string[];
};

function buildConditions(f: BrowseFilters, month: string | null): SQL[] {
  const conds: SQL[] = [
    ne(postings.parseStatus, "skipped"),
    not(postings.isDeleted),
  ];
  if (month !== null) conds.push(eq(postings.month, month));
  if (f.q.length > 0) {
    const like = `%${f.q}%`;
    const qCond = or(
      ilike(postings.company, like),
      ilike(postings.role, like),
      ilike(postings.location, like),
      ilike(postings.rawText, like),
    );
    if (qCond) conds.push(qCond);
  }
  if (f.remote.length > 0) conds.push(inArray(postings.remotePolicy, f.remote));
  if (f.stack.length > 0) conds.push(arrayOverlaps(postings.stackTags, f.stack));
  if (f.salaryMin !== null) {
    conds.push(
      sql`coalesce(${postings.salaryMax}, ${postings.salaryMin}) >= ${f.salaryMin}`,
    );
  }
  if (f.visa) conds.push(eq(postings.visaSponsorship, true));
  return conds;
}

// One column set, two callers (exact-page query + ranked-id hydration).
const ROW_COLUMNS = {
  id: postings.id,
  hnId: postings.hnId,
  company: postings.company,
  role: postings.role,
  location: postings.location,
  remotePolicy: postings.remotePolicy,
  salaryMin: postings.salaryMin,
  salaryMax: postings.salaryMax,
  salaryCurrency: postings.salaryCurrency,
  stackTags: postings.stackTags,
  hnCreatedAt: postings.hnCreatedAt,
  parseStatus: postings.parseStatus,
  firstSweepId: postings.firstSweepId,
  rawText: postings.rawText,
} as const;

type RawRow = {
  id: number;
  hnId: number;
  company: string | null;
  role: string | null;
  location: string | null;
  remotePolicy: "remote" | "hybrid" | "onsite" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  stackTags: string[] | null;
  hnCreatedAt: Date;
  parseStatus: "pending" | "parsed" | "failed" | "skipped";
  firstSweepId: number | null;
  rawText: string;
};

function toPostingRow(
  r: RawRow,
  latestSweepId: number | null,
  snippet: string | undefined,
): PostingRow {
  return {
    id: r.id,
    hnId: r.hnId,
    company: r.company,
    role: r.role,
    location: r.location,
    remotePolicy: r.remotePolicy,
    salaryMin: r.salaryMin,
    salaryMax: r.salaryMax,
    salaryCurrency: r.salaryCurrency,
    stackTags: r.stackTags ?? [],
    hnCreatedAt: r.hnCreatedAt,
    isNew: latestSweepId !== null && r.firstSweepId === latestSweepId,
    parseStatus: r.parseStatus,
    rawTextPreview: r.rawText.split("\n")[0]?.slice(0, 120) ?? "",
    ...(snippet !== undefined ? { relevanceSnippet: snippet } : {}),
  };
}

/** True when a relevance-ranked search engine drives the result set. */
function usesSearchEngine(f: BrowseFilters): boolean {
  return f.q.length > 0 && (f.mode === "semantic" || f.mode === "hybrid");
}

export async function getBrowsePostings(f: BrowseFilters): Promise<BrowseResult> {
  const availableMonths = await getAvailableMonths();
  const month = f.month ?? availableMonths[0] ?? null;

  const monthOnly = and(
    ne(postings.parseStatus, "skipped"),
    not(postings.isDeleted),
    month !== null ? eq(postings.month, month) : undefined,
  );

  // Facets + freshness are mode-independent — fetch once, in parallel.
  const [monthRows, stackRows, latestSweepId] = await Promise.all([
    db.select({ n: count() }).from(postings).where(monthOnly),
    db.execute(sql`
      select tag, count(*) as n
      from ${postings}, unnest(${postings.stackTags}) as tag
      where ${monthOnly}
      group by tag
      order by n desc, tag asc
      limit 30
    `),
    getLatestCompletedSweepId(),
  ]);

  const facets = {
    totalInMonth: monthRows[0]?.n ?? 0,
    page: f.page,
    pageSize: PAGE_SIZE,
    month,
    availableMonths,
    availableStacks: (stackRows.rows as { tag: string }[]).map((r) => r.tag),
  };

  if (usesSearchEngine(f)) {
    const { ids, snippets, total } = await searchPostings(
      f,
      month,
      PAGE_SIZE,
      (f.page - 1) * PAGE_SIZE,
    );
    const rows =
      ids.length > 0
        ? await db
            .select(ROW_COLUMNS)
            .from(postings)
            .where(inArray(postings.id, ids))
        : [];
    // Re-impose the engine's rank order — SQL `in (...)` doesn't preserve it.
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((r): r is RawRow => r !== undefined);
    return {
      rows: ordered.map((r) =>
        toPostingRow(r, latestSweepId, snippets.get(r.id) ?? ""),
      ),
      total,
      ...facets,
    };
  }

  // Exact mode (and the no-query default): ILIKE + recency ordering, unchanged.
  const where = and(...buildConditions(f, month));
  const [rows, totalRows] = await Promise.all([
    db
      .select(ROW_COLUMNS)
      .from(postings)
      .where(where)
      .orderBy(desc(postings.hnCreatedAt))
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(postings).where(where),
  ]);

  return {
    rows: rows.map((r) => toPostingRow(r, latestSweepId, undefined)),
    total: totalRows[0]?.n ?? 0,
    ...facets,
  };
}

export type PostingDetail = {
  id: number;
  hnId: number;
  author: string;
  hnCreatedAt: Date;
  month: string;
  rawText: string;
  parseStatus: "pending" | "parsed" | "failed" | "skipped";
  parseError: string | null;
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
  isNew: boolean;
};

export async function getPostingDetail(hnId: number): Promise<PostingDetail | null> {
  const [rows, latestSweepId] = await Promise.all([
    db.select().from(postings).where(eq(postings.hnId, hnId)).limit(1),
    getLatestCompletedSweepId(),
  ]);
  const r = rows[0];
  if (!r || r.isDeleted) return null;
  return {
    id: r.id,
    hnId: r.hnId,
    author: r.author,
    hnCreatedAt: r.hnCreatedAt,
    month: r.month,
    rawText: r.rawText,
    parseStatus: r.parseStatus,
    parseError: r.parseError,
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
    isNew: latestSweepId !== null && r.firstSweepId === latestSweepId,
  };
}
