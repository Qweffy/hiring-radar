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

export async function getBrowsePostings(f: BrowseFilters): Promise<BrowseResult> {
  const availableMonths = await getAvailableMonths();
  const month = f.month ?? availableMonths[0] ?? null;

  const conds = buildConditions(f, month);
  const where = and(...conds);
  const monthOnly = and(
    ne(postings.parseStatus, "skipped"),
    not(postings.isDeleted),
    month !== null ? eq(postings.month, month) : undefined,
  );

  const [rows, totalRows, monthRows, stackRows, latestSweepId] =
    await Promise.all([
      db
        .select({
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
        })
        .from(postings)
        .where(where)
        .orderBy(desc(postings.hnCreatedAt))
        .limit(PAGE_SIZE)
        .offset((f.page - 1) * PAGE_SIZE),
      db.select({ n: count() }).from(postings).where(where),
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

  return {
    rows: rows.map((r) => ({
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
    })),
    total: totalRows[0]?.n ?? 0,
    totalInMonth: monthRows[0]?.n ?? 0,
    page: f.page,
    pageSize: PAGE_SIZE,
    month,
    availableMonths,
    availableStacks: (stackRows.rows as { tag: string }[]).map((r) => r.tag),
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
