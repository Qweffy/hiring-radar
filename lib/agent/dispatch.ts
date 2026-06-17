import "server-only";
import { type z } from "zod";

import {
  compareToProfileArgs,
  getProfileArgs,
  isToolName,
  readPostingArgs,
  recallMemoryArgs,
  rememberArgs,
  saveFindingArgs,
  searchJobsArgs,
  toolError,
  type ToolName,
} from "@/lib/agent/tool-schemas";
import { executeTool, type ToolContext, type ToolExecResult } from "@/lib/agent/tools";

/**
 * The boundary between the model's raw tool call and execution. Owns: the
 * static name allow-list, defensive JSON.parse of the model-written arguments
 * string, and Zod validation against the matching schema. Any failure here is
 * returned as a tool-error DATA object so the model can fix its own call —
 * nothing throws (docs/best-practices/agent-tool-loops.md, ai-security.md).
 */

const SCHEMA_BY_NAME: Record<ToolName, z.ZodType> = {
  get_profile: getProfileArgs,
  search_jobs: searchJobsArgs,
  read_posting: readPostingArgs,
  compare_to_profile: compareToProfileArgs,
  save_finding: saveFindingArgs,
  recall_memory: recallMemoryArgs,
  remember: rememberArgs,
};

export interface DispatchOutcome {
  /** What goes into the role:"tool" message content (already an object). */
  result: unknown;
  /** Parsed args when valid (for the trace), else null. */
  parsedArgs: Record<string, unknown> | null;
  newPick: boolean;
}

/**
 * Validate and run one tool call. `rawName` and `rawArgs` come straight off the
 * model's tool_call (arguments is a JSON string). Returns the object to send
 * back as the tool observation, never throws on bad model input — only an
 * unexpected executor fault would propagate (and the loop catches that).
 */
export async function dispatchToolCall(
  rawName: string,
  rawArgs: string,
  ctx: ToolContext,
): Promise<DispatchOutcome> {
  if (!isToolName(rawName)) {
    return {
      result: toolError(
        "Forbidden",
        `Unknown tool "${rawName}". Allowed: get_profile, search_jobs, read_posting, compare_to_profile, save_finding, recall_memory, remember.`,
        false,
      ),
      parsedArgs: null,
      newPick: false,
    };
  }

  let json: unknown;
  try {
    json = rawArgs.trim() === "" ? {} : JSON.parse(rawArgs);
  } catch {
    return {
      result: toolError(
        "InputValidationError",
        "Arguments were not valid JSON. Re-emit the call with a valid JSON object.",
        true,
      ),
      parsedArgs: null,
      newPick: false,
    };
  }

  const parsed = SCHEMA_BY_NAME[rawName].safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail = issue
      ? `${issue.path.join(".") || "(root)"}: ${issue.message}`
      : "invalid arguments";
    return {
      result: toolError(
        "InputValidationError",
        `Argument validation failed — ${detail}. Fix and retry.`,
        true,
      ),
      parsedArgs: null,
      newPick: false,
    };
  }

  const exec: ToolExecResult = await executeTool(rawName, parsed.data, ctx);
  return {
    result: exec.data,
    parsedArgs: parsed.data as Record<string, unknown>,
    newPick: exec.newPick,
  };
}
