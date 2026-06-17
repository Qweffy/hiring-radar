import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  assessments,
  postings,
  shortlistEntries,
  type AgentStepUsage,
  type AssessmentReason,
} from "@/db/schema";
import { costOfUsage } from "@/lib/agent/cost";
import { agentModel, groqClient } from "@/lib/agent/groq-client";
import { rememberMemory } from "@/lib/queries/memory";

/**
 * Post-run consolidation: distil a finished run's assessments into long-term
 * memory so the next run can skip work. For every company this run judged we
 * write a `verdict` memory (deduped per-subject by rememberMemory); then one
 * cheap, strict-JSON Groq call mines 0-3 durable `preference` memories from the
 * dismissed companies and their friction reasons.
 *
 * server-only: it reads assessments, calls Groq, and writes memories. neon-http
 * has no transactions — every memory write is an idempotent upsert/merge.
 */

interface AssessedPosting {
  postingId: number;
  company: string | null;
  role: string | null;
  score: number;
  reasons: AssessmentReason[];
  shortlisted: boolean;
}

/** Read what this run assessed, with shortlist membership for the verdict label. */
async function readRunAssessments(runId: number): Promise<AssessedPosting[]> {
  const rows = await db
    .select({
      postingId: assessments.postingId,
      company: postings.company,
      role: postings.role,
      score: assessments.score,
      reasons: assessments.reasons,
      shortlistId: shortlistEntries.id,
    })
    .from(assessments)
    .innerJoin(postings, eq(postings.id, assessments.postingId))
    .leftJoin(
      shortlistEntries,
      eq(shortlistEntries.postingId, assessments.postingId),
    )
    .where(eq(assessments.runId, runId));

  return rows.map((r) => ({
    postingId: r.postingId,
    company: r.company,
    role: r.role,
    score: r.score,
    reasons: r.reasons,
    shortlisted: r.shortlistId !== null,
  }));
}

/** Compact "+ fit / - friction" summary used in the verdict text and the LLM input. */
function topReason(reasons: AssessmentReason[]): string {
  const first = reasons[0];
  if (!first) return "no reason recorded";
  return `${first.sign === "+" ? "fit" : "friction"}: ${first.text}`;
}

function verdictText(a: AssessedPosting): string {
  const subject = a.company ?? a.role ?? `posting ${String(a.postingId)}`;
  const decision = a.shortlisted ? "shortlisted" : "dismissed";
  return `${subject} — assessed ${String(a.score)}, ${decision}: ${topReason(a.reasons)}`;
}

const preferencesSchema = z.object({
  preferences: z
    .array(z.string().trim().min(1).max(280))
    .max(3),
});

const PREF_SYSTEM = `You distil a job-matching agent's run into durable user PREFERENCES for future runs.

You are given a list of companies the agent DISMISSED this run, each with a score and the friction reason. Infer 0 to 3 short, general preferences the agent should remember next time — patterns across the dismissals, not one-off facts. Examples: "Avoid roles requiring on-site presence", "Deprioritize early-stage (pre-seed) companies", "Skip roles without a stated salary range".

Rules:
- Generalize: a preference must apply to FUTURE postings, never name a single company.
- Only emit a preference you can actually support from the dismissals. If there's no clear pattern, return an empty list.
- Each preference is one short imperative sentence, max 280 chars.
- Return at most 3.`;

interface PreferenceResult {
  preferences: string[];
  usage: AgentStepUsage | null;
}

/** One cheap strict-JSON Groq call mining preferences from the dismissals. */
async function distilPreferences(
  dismissed: AssessedPosting[],
): Promise<PreferenceResult> {
  if (dismissed.length === 0) return { preferences: [], usage: null };

  const model = agentModel();
  const lines = dismissed.map((a) => {
    const subject = a.company ?? a.role ?? `posting ${String(a.postingId)}`;
    return `- ${subject} (score ${String(a.score)}): ${topReason(a.reasons)}`;
  });

  const res = await groqClient().chat.completions.create({
    model,
    temperature: 0,
    max_completion_tokens: 256,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "run_preferences",
        strict: true,
        schema: z.toJSONSchema(preferencesSchema),
      },
    },
    messages: [
      { role: "system", content: PREF_SYSTEM },
      {
        role: "user",
        content: `Dismissed this run:\n${lines.join("\n")}`,
      },
    ],
  });

  const u = res.usage;
  const usage: AgentStepUsage | null =
    u === undefined
      ? null
      : (() => {
          const promptTokens = u.prompt_tokens;
          const completionTokens = u.completion_tokens;
          const totalTokens = u.total_tokens;
          const acc: AgentStepUsage = {
            promptTokens,
            completionTokens,
            totalTokens,
          };
          acc.costUsd = costOfUsage(model, acc);
          return acc;
        })();

  const content = res.choices[0]?.message.content;
  if (content === null || content === undefined || content === "") {
    return { preferences: [], usage };
  }
  const parsed = preferencesSchema.safeParse(JSON.parse(content));
  if (!parsed.success) return { preferences: [], usage };
  return { preferences: parsed.data.preferences, usage };
}

export interface ConsolidationResult {
  /** Verdict memories written (one per assessed company). */
  verdicts: number;
  /** Preference memories written. */
  preferences: number;
  /** Cost of the single distillation call, accrued onto the run. */
  costUsd: number;
}

/**
 * Consolidate one finished run into long-term memory. No-op if the run made no
 * assessments. Memory writes embed text via rememberMemory, which throws on a
 * runtime without the native embedding lib — the caller (loop) wraps this in a
 * try/catch so consolidation can't block finalization.
 */
export async function consolidateRun(
  runId: number,
): Promise<ConsolidationResult> {
  const assessed = await readRunAssessments(runId);
  if (assessed.length === 0) {
    return { verdicts: 0, preferences: 0, costUsd: 0 };
  }

  let verdicts = 0;
  for (const a of assessed) {
    // salience: how decisive the verdict was — distance of the score from the
    // neutral midpoint, normalized to [0, 1].
    const salience = Math.abs(a.score - 50) / 50;
    await rememberMemory({
      kind: "verdict",
      text: verdictText(a),
      salience,
      postingId: a.postingId,
      company: a.company ?? undefined,
      sourceRunId: runId,
    });
    verdicts += 1;
  }

  const dismissed = assessed.filter((a) => !a.shortlisted);
  const { preferences, usage } = await distilPreferences(dismissed);

  let written = 0;
  for (const text of preferences) {
    await rememberMemory({
      kind: "preference",
      text,
      salience: 0.6,
      sourceRunId: runId,
    });
    written += 1;
  }

  return {
    verdicts,
    preferences: written,
    costUsd: usage?.costUsd ?? 0,
  };
}
