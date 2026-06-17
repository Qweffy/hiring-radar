import  { type AgentStepUsage } from "@/db/schema";

/**
 * Groq pricing for openai/gpt-oss-120b, USD per 1M tokens (verified 2026-06 in
 * docs/best-practices/groq-llm-api.md: $0.15 input / $0.60 output). Pin here so
 * the USD budget is computed from a single source — if the model env changes to
 * a different priced model, update this table.
 */
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "openai/gpt-oss-120b": { input: 0.15, output: 0.6 },
  "openai/gpt-oss-20b": { input: 0.1, output: 0.5 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
};

/** Fallback when the model id is unknown — use the most expensive known rate. */
const FALLBACK = { input: 0.59, output: 0.79 };

/** USD cost of one model call, from its prompt/completion token split. */
export function costOfUsage(model: string, usage: AgentStepUsage): number {
  const rate = PRICING_PER_MTOK[model] ?? FALLBACK;
  return (
    (usage.promptTokens * rate.input + usage.completionTokens * rate.output) /
    1_000_000
  );
}

/**
 * The three hard caps every run enforces. A run terminates the moment any of
 * them trips — defaults are deliberately generous for the interactive scan but
 * bounded so a runaway loop can't drain the Groq budget.
 */
export interface RunBudget {
  /** Max loop iterations (model round-trips). */
  stepBudget: number;
  /** Cumulative prompt+completion tokens across the whole run. */
  maxTokens: number;
  /** Cumulative estimated USD across the whole run. */
  maxUsd: number;
}

export const DEFAULT_BUDGET: RunBudget = {
  stepBudget: 24,
  maxTokens: 600_000,
  maxUsd: 1.0,
};

/** Running totals, accumulated as the loop advances. */
export interface RunTotals {
  steps: number;
  tokens: number;
  usd: number;
}

export type BudgetVerdict =
  | { exhausted: false }
  | { exhausted: true; reason: "steps" | "tokens" | "usd" };

/** Has any cap tripped? Checked before each model call. */
export function checkBudget(
  totals: RunTotals,
  budget: RunBudget,
): BudgetVerdict {
  if (totals.steps >= budget.stepBudget) {
    return { exhausted: true, reason: "steps" };
  }
  if (totals.tokens >= budget.maxTokens) {
    return { exhausted: true, reason: "tokens" };
  }
  if (totals.usd >= budget.maxUsd) {
    return { exhausted: true, reason: "usd" };
  }
  return { exhausted: false };
}
