import "server-only";
import { and, desc, eq, ne, not, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings, sweeps } from "@/db/schema";
import {
  classifyCategory,
  recencyToScore,
  salaryToTier,
  type Category,
  type Tier,
} from "@/lib/radar";
import {
  getAvailableMonths,
  getLatestIngestSweepId,
} from "@/lib/queries/sweeps";

/** Hard cap on blips drawn on the scope, for legibility. */
export const BLIP_CAP = 120;

export type DashboardBlip = {
  hnId: number;
  company: string;
  role: string;
  /** Pre-formatted salary range, or null when the posting states none. */
  salaryLabel: string | null;
  /** Annual figure used for the size band: coalesce(salaryMax, salaryMin). */
  salaryValue: number | null;
  category: Category;
  tier: Tier;
  /** Recency-derived pseudo-match (0-100). M5: real agent match score. */
  match: number;
  region: string | null;
  isNew: boolean;
};

export type SignalKind = "completed" | "failed" | "partial" | "running";

export type SignalLine = {
  /** Stable key for React lists. */
  id: number;
  /** "06:00" UTC HH:MM of the event. */
  time: string;
  text: string;
  badge: string | null;
  kind: SignalKind;
};

export type DashboardScorecards = {
  newCount: number;
  newDelta: number | null;
  remoteSharePct: number;
  medianSalary: number | null;
  /** Parsed share — honest stand-in until M5 ships "Match ≥ 80". */
  parsedCount: number;
  parsedTotal: number;
};

export type SweepCaption = {
  /** "YYYY-MM" of the data in scope. */
  month: string | null;
  totalPostings: number;
  newCount: number;
};

export type DashboardData = {
  month: string | null;
  scorecards: DashboardScorecards;
  blips: DashboardBlip[];
  /** True when more month postings exist than the blip cap allows. */
  blipsCapped: boolean;
  signalFeed: SignalLine[];
  sweepCaption: SweepCaption;
  /** Whether any non-skipped, non-deleted posting exists in the month. */
  hasPostings: boolean;
};

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };

function kNotation(n: number): string {
  return n >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : n.toLocaleString("en-US");
}

/** Compact salary range, mirroring lib/format but null-aware for the radar. */
function salaryRange(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min === null && max === null) return null;
  const sym = (currency && CURRENCY_SYMBOL[currency]) ?? (currency ? `${currency} ` : "$");
  if (min !== null && max !== null) {
    return min === max ? `${sym}${kNotation(min)}` : `${sym}${kNotation(min)}–${sym}${kNotation(max)}`;
  }
  const single = (min ?? max) as number;
  return min !== null ? `${sym}${kNotation(single)}+` : `up to ${sym}${kNotation(single)}`;
}

function hhmmUtc(at: Date): string {
  const hh = String(at.getUTCHours()).padStart(2, "0");
  const mm = String(at.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const REMOTE_LABEL: Record<"remote" | "hybrid" | "onsite", string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

function signalForSweep(s: {
  id: number;
  status: "running" | "completed" | "failed" | "partial";
  newCount: number;
  fetchedCount: number;
  finishedAt: Date | null;
  startedAt: Date;
}): SignalLine {
  const at = s.finishedAt ?? s.startedAt;
  const time = hhmmUtc(at);
  switch (s.status) {
    case "completed":
      return {
        id: s.id,
        time,
        text: `Sweep completed — ${s.newCount} new postings ingested.`,
        badge: "COMPLETED",
        kind: "completed",
      };
    case "partial":
      return {
        id: s.id,
        time,
        text: `Sweep degraded — ${s.fetchedCount} fetched, ${s.newCount} new.`,
        badge: "PARTIAL",
        kind: "partial",
      };
    case "failed":
      return {
        id: s.id,
        time,
        text: "Sweep failed — pipeline error, last good data retained.",
        badge: "FAILED",
        kind: "failed",
      };
    case "running":
      return {
        id: s.id,
        time,
        text: "Sweep running — fetching the latest thread.",
        badge: "RUNNING",
        kind: "running",
      };
  }
}

/**
 * Everything the Radar Dashboard needs from the latest month. One server-only
 * read; the route streams behind loading.tsx. M1 leaves this uncached (matches
 * the shell layout); M4 revisits with 'use cache' + cacheTag keyed by ingestion.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const months = await getAvailableMonths();
  const month = months[0] ?? null;

  if (month === null) {
    return {
      month: null,
      scorecards: {
        newCount: 0,
        newDelta: null,
        remoteSharePct: 0,
        medianSalary: null,
        parsedCount: 0,
        parsedTotal: 0,
      },
      blips: [],
      blipsCapped: false,
      signalFeed: [],
      sweepCaption: { month: null, totalPostings: 0, newCount: 0 },
      hasPostings: false,
    };
  }

  const inMonth = and(
    eq(postings.month, month),
    ne(postings.parseStatus, "skipped"),
    not(postings.isDeleted),
  );

  const [
    latestSweepId,
    rows,
    aggRows,
    medianRows,
    recentSweeps,
  ] = await Promise.all([
    getLatestIngestSweepId(),
    db
      .select({
        hnId: postings.hnId,
        company: postings.company,
        role: postings.role,
        salaryMin: postings.salaryMin,
        salaryMax: postings.salaryMax,
        salaryCurrency: postings.salaryCurrency,
        stackTags: postings.stackTags,
        remotePolicy: postings.remotePolicy,
        parseStatus: postings.parseStatus,
        hnCreatedAt: postings.hnCreatedAt,
        firstSweepId: postings.firstSweepId,
      })
      .from(postings)
      .where(inMonth)
      .orderBy(desc(postings.hnCreatedAt)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        remote: sql<number>`count(*) filter (where ${postings.remotePolicy} = 'remote')::int`,
        parsed: sql<number>`count(*) filter (where ${postings.parseStatus} = 'parsed')::int`,
      })
      .from(postings)
      .where(inMonth),
    // Median of coalesce(salaryMax, salaryMin) where a value is present.
    db
      .select({
        median: sql<
          number | null
        >`(percentile_cont(0.5) within group (order by coalesce(${postings.salaryMax}, ${postings.salaryMin})))::int`,
      })
      .from(postings)
      .where(
        and(inMonth, sql`coalesce(${postings.salaryMax}, ${postings.salaryMin}) is not null`),
      ),
    db
      .select({
        id: sweeps.id,
        status: sweeps.status,
        newCount: sweeps.newCount,
        fetchedCount: sweeps.fetchedCount,
        finishedAt: sweeps.finishedAt,
        startedAt: sweeps.startedAt,
      })
      .from(sweeps)
      .orderBy(desc(sweeps.id))
      .limit(6),
  ]);

  const agg = aggRows[0] ?? { total: 0, remote: 0, parsed: 0 };
  const total = agg.total;
  const newCount = latestSweepId === null
    ? 0
    : rows.filter((r) => r.firstSweepId === latestSweepId).length;

  // Recency window for the pseudo-match score (M5: replaced by real match).
  const times = rows.map((r) => r.hnCreatedAt.getTime());
  const newestMs = times.length > 0 ? Math.max(...times) : 0;
  const oldestMs = times.length > 0 ? Math.min(...times) : 0;

  const allBlips: DashboardBlip[] = rows.map((r) => {
    const stackTags = r.stackTags ?? [];
    const salaryValue = r.salaryMax ?? r.salaryMin;
    const region = r.remotePolicy !== null ? REMOTE_LABEL[r.remotePolicy] : null;
    return {
      hnId: r.hnId,
      company: r.company ?? "Unknown",
      role: r.role ?? "Untitled role",
      salaryLabel: salaryRange(r.salaryMin, r.salaryMax, r.salaryCurrency),
      salaryValue,
      category: classifyCategory(stackTags, r.role),
      tier: salaryToTier(salaryValue),
      match: recencyToScore(r.hnCreatedAt.getTime(), oldestMs, newestMs),
      region,
      isNew: latestSweepId !== null && r.firstSweepId === latestSweepId,
    };
  });

  // Rows are already newest-first; the cap keeps the most-recent postings.
  const blips = allBlips.slice(0, BLIP_CAP);

  const signalFeed = recentSweeps.map(signalForSweep);

  // Delta: new-this-month vs the prior sweep that actually ingested. Reparse
  // sweeps (newCount 0) are excluded so the delta never reads "−<all>"; null
  // until at least two real ingests exist (i.e. once M4's monthly cron runs).
  const ingestSweeps = recentSweeps.filter((s) => s.newCount > 0);
  const newDelta =
    ingestSweeps.length >= 2 ? newCount - ingestSweeps[1].newCount : null;

  return {
    month,
    scorecards: {
      newCount,
      newDelta,
      remoteSharePct: total > 0 ? Math.round((agg.remote / total) * 100) : 0,
      medianSalary: medianRows[0]?.median ?? null,
      parsedCount: agg.parsed,
      parsedTotal: total,
    },
    blips,
    blipsCapped: allBlips.length > BLIP_CAP,
    signalFeed,
    sweepCaption: { month, totalPostings: total, newCount },
    hasPostings: total > 0,
  };
}
