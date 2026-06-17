import { z } from "zod";

import { remotePolicy } from "@/db/schema";
import { type ActionResult, err, ok } from "@/lib/result";

export function firstIssueMessage(error: z.ZodError): string {
  const flat = z.flattenError(error);
  const fieldMsg = Object.values(flat.fieldErrors)
    .flat()
    .find((m): m is string => typeof m === "string");
  return fieldMsg ?? flat.formErrors[0] ?? "Invalid input";
}

export function parseOrThrow<S extends z.ZodType>(
  schema: S,
  input: unknown,
): z.infer<S> {
  const r = schema.safeParse(input);
  if (!r.success) throw new Error(firstIssueMessage(r.error));
  return r.data;
}

export function parseOrResult<S extends z.ZodType>(
  schema: S,
  input: unknown,
): ActionResult<z.infer<S>> {
  const r = schema.safeParse(input);
  return r.success ? ok(r.data) : err(firstIssueMessage(r.error));
}

/* ------------------------------------------------------------------ */
/* HN Algolia boundary — validate defensively, ignore unknown keys     */
/* ------------------------------------------------------------------ */

export const hnCommentSchema = z.looseObject({
  id: z.number().int().positive(),
  author: z.string().nullable().catch(null),
  created_at: z.iso.datetime({ offset: true }).or(z.string()),
  text: z.string().nullable().catch(null),
  type: z.string(),
  points: z.number().int().nullable().catch(null),
});

export const hnThreadSchema = z.looseObject({
  id: z.number().int().positive(),
  title: z.string().nullable().catch(null),
  children: z.array(hnCommentSchema),
});

export type HnComment = z.infer<typeof hnCommentSchema>;
export type HnThread = z.infer<typeof hnThreadSchema>;

/* ------------------------------------------------------------------ */
/* LLM extraction output — strict: shape comes from constrained        */
/* decoding, but we NEVER trust model output without this parse.       */
/* Strict-mode rules: every field required, so nullable — not optional.*/
/* ------------------------------------------------------------------ */

export const llmPostingSchema = z.strictObject({
  isJobPosting: z.boolean(),
  company: z.string().trim().min(1).max(200).nullable(),
  role: z.string().trim().min(1).max(200).nullable(),
  location: z.string().trim().min(1).max(200).nullable(),
  companyStage: z.string().trim().min(1).max(100).nullable(),
  remotePolicy: z.enum(remotePolicy.enumValues).nullable(),
  salaryMin: z.number().int().positive().max(5_000_000).nullable(),
  salaryMax: z.number().int().positive().max(5_000_000).nullable(),
  salaryCurrency: z.string().length(3).nullable(),
  salaryRaw: z.string().max(120).nullable(),
  stackTags: z.array(z.string().trim().min(1).max(40)).max(12),
  visaSponsorship: z.boolean().nullable(),
  contact: z.string().trim().max(300).nullable(),
});

export type LlmPosting = z.infer<typeof llmPostingSchema>;

/* ------------------------------------------------------------------ */
/* CV skill extraction — the agent reads pasted CV text and buckets    */
/* skills by depth. Strict mode: every field required (constrained     */
/* decoding), but the zod parse is the trust boundary, never the model.*/
/* ------------------------------------------------------------------ */

const cvSkillList = z.array(z.string().trim().min(1).max(40)).max(24);

export const cvSkillsSchema = z.strictObject({
  core: cvSkillList,
  familiar: cvSkillList,
  learning: cvSkillList,
  summary: z.string().trim().min(1).max(600).nullable(),
});

export type CvSkills = z.infer<typeof cvSkillsSchema>;
