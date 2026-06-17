import { z } from "zod";

/**
 * Zod schemas for every tool's arguments. The model writes
 * `function.arguments` as a JSON string we never trust — JSON.parse, then parse
 * against these before any execution (docs/best-practices/agent-tool-loops.md,
 * ai-security.md). A parse failure becomes a tool-error observation, not a
 * crash, so the model can self-correct.
 *
 * z.strictObject so an unexpected key is rejected rather than silently dropped.
 */

export const getProfileArgs = z.strictObject({});

export const searchJobsArgs = z.strictObject({
  query: z.string().trim().min(1).max(200),
  remote: z.enum(["remote", "hybrid", "onsite"]).optional(),
  salaryMin: z.number().int().min(0).max(5_000_000).optional(),
  stack: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export const readPostingArgs = z.strictObject({
  hnId: z.number().int().positive(),
});

export const compareToProfileArgs = z.strictObject({
  hnId: z.number().int().positive(),
});

export const saveFindingArgs = z.strictObject({
  hnId: z.number().int().positive(),
  score: z.number().int().min(0).max(100),
  reasons: z
    .array(
      z.strictObject({
        sign: z.enum(["+", "-"]),
        text: z.string().trim().min(1).max(300),
      }),
    )
    .min(1)
    .max(8),
  decision: z.enum(["shortlist", "dismiss"]),
});

export const recallMemoryArgs = z.strictObject({
  query: z.string().trim().min(1).max(200),
  k: z.number().int().min(1).max(10).optional(),
});

export const rememberArgs = z.strictObject({
  kind: z.enum(["fact", "preference", "verdict"]),
  text: z.string().trim().min(1).max(400),
  salience: z.number().min(0).max(1),
  postingId: z.number().int().positive().nullable(),
});

export type GetProfileArgs = z.infer<typeof getProfileArgs>;
export type SearchJobsArgs = z.infer<typeof searchJobsArgs>;
export type ReadPostingArgs = z.infer<typeof readPostingArgs>;
export type CompareToProfileArgs = z.infer<typeof compareToProfileArgs>;
export type SaveFindingArgs = z.infer<typeof saveFindingArgs>;
export type RecallMemoryArgs = z.infer<typeof recallMemoryArgs>;
export type RememberArgs = z.infer<typeof rememberArgs>;

/** Static allow-list of tool names. The dispatcher refuses anything else. */
export const TOOL_NAMES = [
  "get_profile",
  "search_jobs",
  "read_posting",
  "compare_to_profile",
  "save_finding",
  "recall_memory",
  "remember",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export function isToolName(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}

/** A tool error returned AS DATA in the tool message — never thrown. */
export interface ToolError {
  error: {
    type:
      | "InputValidationError"
      | "NotFound"
      | "Upstream"
      | "Internal"
      | "Forbidden";
    message: string;
    retryable: boolean;
  };
}

export function toolError(
  type: ToolError["error"]["type"],
  message: string,
  retryable: boolean,
): ToolError {
  return { error: { type, message, retryable } };
}
