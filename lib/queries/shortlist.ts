import "server-only";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assessments,
  postings,
  shortlistEntries,
  shortlistNotes,
  type AssessmentReason,
} from "@/db/schema";

export type ShortlistStage =
  | "new"
  | "applied"
  | "interviewing"
  | "offer"
  | "archived";

export type ShortlistSource = "agent" | "manual";

export type ShortlistNote = {
  id: number;
  body: string;
  createdAt: Date;
};

export type ShortlistItem = {
  entryId: number;
  postingId: number;
  hnId: number;
  stage: ShortlistStage;
  source: ShortlistSource;
  runId: number | null;
  addedAt: Date;
  updatedAt: Date;
  // Posting fields surfaced on the card.
  company: string | null;
  role: string | null;
  location: string | null;
  remotePolicy: "remote" | "hybrid" | "onsite" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  stackTags: string[];
  // Latest assessment, if the agent scored this posting.
  matchScore: number | null;
  matchReasons: AssessmentReason[] | null;
  // Notes, newest-first.
  notes: ShortlistNote[];
};

/** Per-stage counts for the pipeline tabs, plus an "all" total. */
export type ShortlistStageCounts = Record<ShortlistStage, number> & {
  all: number;
};

type EntryRow = {
  entryId: number;
  postingId: number;
  hnId: number;
  stage: ShortlistStage;
  source: ShortlistSource;
  runId: number | null;
  addedAt: Date;
  updatedAt: Date;
  company: string | null;
  role: string | null;
  location: string | null;
  remotePolicy: "remote" | "hybrid" | "onsite" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  stackTags: string[] | null;
  matchScore: number | null;
  matchReasons: AssessmentReason[] | null;
};

/**
 * Shortlist entries (optionally filtered to one stage), each joined to its
 * posting fields and latest assessment, with notes attached newest-first.
 * Ordered by most-recently-updated. Notes are fetched in a second keyed query
 * (one-to-many) and stitched in JS — neon-http has no transactions, but two
 * sequential reads are consistent enough for a single-user app.
 */
export async function getShortlist(
  stage?: ShortlistStage,
): Promise<ShortlistItem[]> {
  const entryRows: EntryRow[] = await db
    .select({
      entryId: shortlistEntries.id,
      postingId: shortlistEntries.postingId,
      hnId: postings.hnId,
      stage: shortlistEntries.stage,
      source: shortlistEntries.source,
      runId: shortlistEntries.runId,
      addedAt: shortlistEntries.addedAt,
      updatedAt: shortlistEntries.updatedAt,
      company: postings.company,
      role: postings.role,
      location: postings.location,
      remotePolicy: postings.remotePolicy,
      salaryMin: postings.salaryMin,
      salaryMax: postings.salaryMax,
      salaryCurrency: postings.salaryCurrency,
      stackTags: postings.stackTags,
      matchScore: assessments.score,
      matchReasons: assessments.reasons,
    })
    .from(shortlistEntries)
    .innerJoin(postings, eq(postings.id, shortlistEntries.postingId))
    .leftJoin(assessments, eq(assessments.postingId, shortlistEntries.postingId))
    .where(stage ? eq(shortlistEntries.stage, stage) : undefined)
    .orderBy(desc(shortlistEntries.updatedAt));

  if (entryRows.length === 0) return [];

  const entryIds = entryRows.map((r) => r.entryId);
  const noteRows = await db
    .select({
      id: shortlistNotes.id,
      entryId: shortlistNotes.entryId,
      body: shortlistNotes.body,
      createdAt: shortlistNotes.createdAt,
    })
    .from(shortlistNotes)
    .where(inArray(shortlistNotes.entryId, entryIds))
    .orderBy(desc(shortlistNotes.createdAt));

  const notesByEntry = new Map<number, ShortlistNote[]>();
  for (const n of noteRows) {
    const list = notesByEntry.get(n.entryId);
    const note: ShortlistNote = {
      id: n.id,
      body: n.body,
      createdAt: n.createdAt,
    };
    if (list) {
      list.push(note);
    } else {
      notesByEntry.set(n.entryId, [note]);
    }
  }

  return entryRows.map((r) => ({
    entryId: r.entryId,
    postingId: r.postingId,
    hnId: r.hnId,
    stage: r.stage,
    source: r.source,
    runId: r.runId,
    addedAt: r.addedAt,
    updatedAt: r.updatedAt,
    company: r.company,
    role: r.role,
    location: r.location,
    remotePolicy: r.remotePolicy,
    salaryMin: r.salaryMin,
    salaryMax: r.salaryMax,
    salaryCurrency: r.salaryCurrency,
    stackTags: r.stackTags ?? [],
    matchScore: r.matchScore,
    matchReasons: r.matchReasons,
    notes: notesByEntry.get(r.entryId) ?? [],
  }));
}

/** Count of entries per stage tab, plus the grand total. */
export async function getShortlistStageCounts(): Promise<ShortlistStageCounts> {
  const rows = await db
    .select({
      stage: shortlistEntries.stage,
      n: sql<number>`count(*)::int`,
    })
    .from(shortlistEntries)
    .groupBy(shortlistEntries.stage);

  const counts: ShortlistStageCounts = {
    new: 0,
    applied: 0,
    interviewing: 0,
    offer: 0,
    archived: 0,
    all: 0,
  };
  for (const r of rows) {
    counts[r.stage] = r.n;
    counts.all += r.n;
  }
  return counts;
}
