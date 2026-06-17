import  { type AgentStepKind, type AgentStepRow } from "@/lib/queries/agent-runs";

/**
 * The view-model the TraceStep card renders, mapped from the persisted
 * agentSteps rows. The DB stores a low-level append-only log (one row per
 * tool_call, observation, reasoning, decision, error); the UI wants richer
 * cards — a tool card folds its following observation in as a chip, a decision
 * card carries a company/score chip linking to the posting. The mapper
 * (trace-mapper.ts) does that fold so the timeline matches the design.
 */
export type TraceStepType = "tool" | "reasoning" | "decision" | "error";

export interface TraceStep {
  /** Stable key for React — the originating row idx. */
  key: number;
  type: TraceStepType;
  /** tool: the tool name (get_profile, search_jobs, …). */
  name?: string;
  /** tool: single-line, truncated args preview (may carry a "· retry" suffix). */
  argsLine?: string;
  /** tool: pretty-printed, multi-line args for the expanded <pre>. */
  argsJson?: string;
  /** tool: the phosphor observation chip text, e.g. "→ 42 results · 180ms". */
  obs?: string;
  /** reasoning/decision/error: the body text. */
  text?: string;
  /** decision: shortlist → "yes", dismiss → "no". */
  decision?: "yes" | "no";
  /** decision: company name for the chip. */
  chipCompany?: string;
  /** decision: score shown in the chip. */
  chipScore?: string;
  /** decision: hnId the chip links to (/browse?selected=hnId). */
  chipHnId?: number;
  /** reasoning: the live, still-streaming step → "Thinking…" + pulse. */
  live?: boolean;
}

export type { AgentStepKind, AgentStepRow };
