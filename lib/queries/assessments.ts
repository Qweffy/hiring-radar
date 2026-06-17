import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assessments, type AssessmentReason } from "@/db/schema";

export type AssessmentRow = {
  postingId: number;
  runId: number | null;
  score: number;
  reasons: AssessmentReason[];
  createdAt: Date;
};

const ASSESSMENT_COLUMNS = {
  postingId: assessments.postingId,
  runId: assessments.runId,
  score: assessments.score,
  reasons: assessments.reasons,
  createdAt: assessments.createdAt,
} as const;

/** The latest assessment for a posting (unique on postingId), or null. */
export async function getAssessment(
  postingId: number,
): Promise<AssessmentRow | null> {
  const rows = await db
    .select(ASSESSMENT_COLUMNS)
    .from(assessments)
    .where(eq(assessments.postingId, postingId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Assessments for a set of postings, keyed by postingId — for badging match
 * scores into browse/dashboard/detail without an N+1. An empty input short-
 * circuits (no `in ()` round-trip).
 */
export async function getAssessmentsByPostingIds(
  postingIds: number[],
): Promise<Map<number, AssessmentRow>> {
  if (postingIds.length === 0) return new Map();
  const rows = await db
    .select(ASSESSMENT_COLUMNS)
    .from(assessments)
    .where(inArray(assessments.postingId, postingIds));
  return new Map(rows.map((r) => [r.postingId, r]));
}
