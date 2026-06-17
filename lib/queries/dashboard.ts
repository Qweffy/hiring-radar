import "server-only";
import { and, desc, eq, ne, not, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  agentRuns,
  assessments,
  postings,
  shortlistEntries,
  sweeps,
} from "@/db/schema";
import  { type AgentRunStatus } from "@/lib/queries/agent-runs";
import {
  getAvailableMonths,
  getLatestIngestSweepId,
} from "@/lib/queries/sweeps";
import {
  classifyCategory,
  recencyToScore,
  salaryToTier,
  type Category,
  type Tier,
} from "@/lib/radar";

/** Browse/dashboard threshold for the "strong match" scorecard + filter. */
export const STRONG_MATCH_FLOOR = 80;

/** Hard cap on blips drawn on the scope, for legibility. */
export const BLIP_CAP = 120;

export interface DashboardBlip {
  hnId: number;
  company: string;
  role: string;
  /** Pre-formatted salary range, or null when the posting states none. */
  salaryLabel: string | null;
  /** Annual figure used for the size band: coalesce(salaryMax, salaryMin). */
  salaryValue: number | null;
  category: Category;
  tier: Tier;
  /**
   * Blip distance score (0-100). The agent's real assessment score when this
   * posting has been scored; a recency-derived pseudo-score otherwise.
   */
  match: number;
  /** True when `match` is the agent's real score (vs. a recency fallback). */
  isAssessed: boolean;
  /** True when the agent shortlisted this posting — drives the violet halo. */
  shortlisted: boolean;
  region: string | null;
  isNew: boolean;
}

export type SignalKind = "completed" | "failed" | "partial" | "running";

export interface SignalLine {
  /** Stable key for React lists. */
  id: number;
  /** "06:00" UTC HH:MM of the event. */
  time: string;
  text: string;
  badge: string | null;
  kind: SignalKind;
}

export interface DashboardScorecards {
  newCount: number;
  newDelta: number | null;
  remoteSharePct: number;
  medianSalary: number | null;
  /** Postings the agent scored at or above STRONG_MATCH_FLOOR this month. */
  strongMatchCount: number;
  /** Postings the agent has assessed this month (the "of N" denominator). */
  assessedCount: number;
}

export interface SweepCaption {
  /** "YYYY-MM" of the data in scope. */
  month: string | null;
  totalPostings: number;
  newCount: number;
}

/** The single top pick of the latest run — surfaced in the digest card. */
export interface AgentTopMatch {
  hnId: number;
  company: string;
  role: string;
  score: number;
}

/**
 * Latest agent run summary for the digest card. null when the agent has never
 * run — the card then shows the "hasn't scanned yet" empty state.
 */
export interface AgentDigestData {
  runId: number;
  status: AgentRunStatus;
  picksCount: number;
  stepsUsed: number;
  stepBudget: number;
  costUsd: number;
  startedAt: Date;
  finishedAt: Date | null;
  topMatch: AgentTopMatch | null;
}

export interface DashboardData {
  month: string | null;
  scorecards: DashboardScorecards;
  blips: DashboardBlip[];
  /** True when more month postings exist than the blip cap allows. */
  blipsCapped: boolean;
  signalFeed: SignalLine[];
  sweepCaption: SweepCaption;
  /** Latest agent run digest, or null when the agent has never run. */
  agentDigest: AgentDigestData | null;
  /** Whether any non-skipped, non-deleted posting exists in the month. */
  hasPostings: boolean;
}

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
  // Exactly one bound is set here (both-null and both-set returned above).
  // Narrow each side to a non-null number explicitly — no non-null assertion.
  if (min !== null) return `${sym}${kNotation(min)}+`;
  if (max !== null) return `up to ${sym}${kNotation(max)}`;
  return null;
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
        strongMatchCount: 0,
        assessedCount: 0,
      },
      blips: [],
      blipsCapped: false,
      signalFeed: [],
      sweepCaption: { month: null, totalPostings: 0, newCount: 0 },
      agentDigest: null,
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
    agentDigest,
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
        matchScore: assessments.score,
        // An agent-sourced shortlist row marks the posting as shortlisted.
        shortlisted: sql<boolean | null>`${shortlistEntries.source} = 'agent'`,
      })
      .from(postings)
      .leftJoin(assessments, eq(assessments.postingId, postings.id))
      .leftJoin(shortlistEntries, eq(shortlistEntries.postingId, postings.id))
      .where(inMonth)
      .orderBy(desc(postings.hnCreatedAt)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        remote: sql<number>`count(*) filter (where ${postings.remotePolicy} = 'remote')::int`,
        // Real match aggregates over the latest assessment per posting.
        strongMatch: sql<number>`count(*) filter (where ${assessments.score} >= ${STRONG_MATCH_FLOOR})::int`,
        assessed: sql<number>`count(*) filter (where ${assessments.score} is not null)::int`,
      })
      .from(postings)
      .leftJoin(assessments, eq(assessments.postingId, postings.id))
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
    getAgentDigest(),
  ]);

  const agg = aggRows[0] ?? { total: 0, remote: 0, strongMatch: 0, assessed: 0 };
  const total = agg.total;
  const newCount = latestSweepId === null
    ? 0
    : rows.filter((r) => r.firstSweepId === latestSweepId).length;

  // Recency window for the fallback score used by not-yet-assessed postings.
  const times = rows.map((r) => r.hnCreatedAt.getTime());
  const newestMs = times.length > 0 ? Math.max(...times) : 0;
  const oldestMs = times.length > 0 ? Math.min(...times) : 0;

  const allBlips: DashboardBlip[] = rows.map((r) => {
    const stackTags = r.stackTags ?? [];
    const salaryValue = r.salaryMax ?? r.salaryMin;
    const region = r.remotePolicy !== null ? REMOTE_LABEL[r.remotePolicy] : null;
    const score = r.matchScore;
    const isAssessed = score !== null;
    return {
      hnId: r.hnId,
      company: r.company ?? "Unknown",
      role: r.role ?? "Untitled role",
      salaryLabel: salaryRange(r.salaryMin, r.salaryMax, r.salaryCurrency),
      salaryValue,
      category: classifyCategory(stackTags, r.role),
      tier: salaryToTier(salaryValue),
      // Real agent score when present; recency fallback otherwise.
      match:
        score ?? recencyToScore(r.hnCreatedAt.getTime(), oldestMs, newestMs),
      isAssessed,
      shortlisted: r.shortlisted ?? false,
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
  const priorIngest = ingestSweeps[1];
  const newDelta =
    priorIngest !== undefined ? newCount - priorIngest.newCount : null;

  return {
    month,
    scorecards: {
      newCount,
      newDelta,
      remoteSharePct: total > 0 ? Math.round((agg.remote / total) * 100) : 0,
      medianSalary: medianRows[0]?.median ?? null,
      strongMatchCount: agg.strongMatch,
      assessedCount: agg.assessed,
    },
    blips,
    blipsCapped: allBlips.length > BLIP_CAP,
    signalFeed,
    sweepCaption: { month, totalPostings: total, newCount },
    agentDigest,
    hasPostings: total > 0,
  };
}

/**
 * Latest agent run + its single strongest pick, for the digest card. The top
 * match is the highest-scoring assessment produced by that run; null if the run
 * scored nothing. Returns null when the agent has never run.
 */
async function getAgentDigest(): Promise<AgentDigestData | null> {
  const runRows = await db
    .select({
      id: agentRuns.id,
      status: agentRuns.status,
      picksCount: agentRuns.picksCount,
      stepsUsed: agentRuns.stepsUsed,
      stepBudget: agentRuns.stepBudget,
      costUsd: agentRuns.costUsd,
      startedAt: agentRuns.startedAt,
      finishedAt: agentRuns.finishedAt,
    })
    .from(agentRuns)
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);

  const run = runRows[0];
  if (!run) return null;

  const topRows = await db
    .select({
      hnId: postings.hnId,
      company: postings.company,
      role: postings.role,
      score: assessments.score,
    })
    .from(assessments)
    .innerJoin(postings, eq(postings.id, assessments.postingId))
    .where(eq(assessments.runId, run.id))
    .orderBy(desc(assessments.score))
    .limit(1);

  const top = topRows[0];
  const topMatch: AgentTopMatch | null = top
    ? {
        hnId: top.hnId,
        company: top.company ?? "Unknown",
        role: top.role ?? "Untitled role",
        score: top.score,
      }
    : null;

  return {
    runId: run.id,
    status: run.status,
    picksCount: run.picksCount,
    stepsUsed: run.stepsUsed,
    stepBudget: run.stepBudget,
    costUsd: run.costUsd,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    topMatch,
  };
}
