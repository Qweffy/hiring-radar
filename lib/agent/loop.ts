import "server-only";
import  { type AgentStepPayload, type AgentStepUsage } from "@/db/schema";
import {
  checkBudget,
  costOfUsage,
  DEFAULT_BUDGET,
  type RunBudget,
  type RunTotals,
} from "@/lib/agent/cost";
import { dispatchToolCall } from "@/lib/agent/dispatch";
import { agentModel, groqClient } from "@/lib/agent/groq-client";
import { SYSTEM_PROMPT } from "@/lib/agent/prompt";
import { TOOL_DEFINITIONS } from "@/lib/agent/tool-defs";
import { buildToolContext, type ToolContext } from "@/lib/agent/tools";
import { getRun, type AgentStepRow } from "@/lib/queries/agent-runs";
import {
  appendStep,
  finalizeRun,
  getRunStatus,
  setRunStatus,
  updateRunProgress,
} from "@/lib/queries/agent-writes";

import type Groq from "groq-sdk";

/**
 * The hand-rolled observe-act loop. Plain `while` over Groq chat.completions
 * with tools/tool_choice:"auto". Each turn: if finish_reason is "tool_calls",
 * execute ALL calls (read-only ones via Promise.all), append one role:"tool"
 * message per tool_call_id, iterate; terminate on a text answer or a hard cap.
 * Implements docs/best-practices/agent-tool-loops.md.
 *
 * Persistence is append-only and BEFORE the next action (checkpoint), so a
 * crashed run resumes by rebuilding the messages array from agentSteps.
 */

type ChatMessage = Groq.Chat.ChatCompletionMessageParam;

/**
 * How a drive() invocation ended. "completed"/"failed"/"cancelled"/
 * "budget_exhausted" are terminal; "paused" is a resumable stop (used both for
 * a user pause and for a rate limit the loop couldn't ride out — the
 * conversation is fully persisted and resumeRun continues it).
 */
export type TerminalStatus =
  | "completed"
  | "failed"
  | "cancelled"
  | "budget_exhausted"
  | "paused";

export interface RunOutcome {
  runId: number;
  status: TerminalStatus;
  totals: RunTotals;
  picksCount: number;
  finalText: string | null;
}

const TEMPERATURE = 0.3;
const MAX_COMPLETION_TOKENS = 1500;
/** Per-(tool,argsKey) retry cap — stop the model hammering the same bad call. */
const SAME_CALL_RETRY_CAP = 3;
/** How many times to wait out a 429 before giving up on the model call. */
const RATE_LIMIT_RETRIES = 4;
/** Fallback backoff when the 429 carries no retry hint. */
const RATE_LIMIT_FALLBACK_MS = 2000;

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** A 429 we should wait out, vs. any other error we let propagate. */
function isRateLimit(e: unknown): boolean {
  return typeof e === "object" && e !== null && "status" in e && e.status === 429;
}

/** Seconds Groq tells us to wait ("try again in 1.41s"), else a fallback. */
function retryAfterMs(e: unknown): number {
  const msg =
    typeof e === "object" && e !== null && "message" in e
      ? String((e).message)
      : "";
  const m = /try again in ([\d.]+)s/.exec(msg);
  if (m) return Math.ceil(Number(m[1]) * 1000) + 250;
  return RATE_LIMIT_FALLBACK_MS;
}

/** Signals the loop ran out of model budget headroom (429s it couldn't ride out). */
class RateLimitExhausted extends Error {}

/** Short, user-facing summary of a 429 for the trace/error column. */
function retryMessage(e: unknown): string {
  const msg =
    typeof e === "object" && e !== null && "message" in e
      ? String((e).message)
      : "rate limit reached";
  return `Groq rate limit not cleared after ${RATE_LIMIT_RETRIES} retries: ${msg.slice(0, 240)}`;
}

/** Synthesize a deterministic tool_call_id from the step position. */
function toolCallId(idx: number, slot: number): string {
  return `call_${idx}_${slot}`;
}

/**
 * Rebuild the Groq messages array from persisted steps so a resumed run
 * continues from its last checkpoint. The trace stores, per model turn:
 *   - one `reasoning` step holding the assistant text (may be empty) plus the
 *     tool calls it emitted, then
 *   - one `observation` step per tool result.
 * We replay them into the assistant(tool_calls)/tool(result) shape Groq needs.
 */
function rebuildMessages(steps: AgentStepRow[]): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  // Group consecutive tool_call steps that share a turn, followed by their
  // observations. We tag each tool_call step's payload with its turn + slot via
  // the synthesized id, recoverable from idx ordering.
  let pendingCalls: { id: string; name: string; args: string }[] = [];
  let pendingAssistantText = "";

  const flushAssistant = (): void => {
    if (pendingCalls.length === 0 && pendingAssistantText === "") return;
    const msg: ChatMessage = {
      role: "assistant",
      content: pendingAssistantText || null,
    };
    if (pendingCalls.length > 0) {
      msg.tool_calls = pendingCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.args },
      }));
    }
    messages.push(msg);
    pendingCalls = [];
    pendingAssistantText = "";
  };

  for (const s of steps) {
    if (s.kind === "reasoning") {
      // Reasoning step always closes any prior tool turn first.
      flushAssistant();
      const p = s.payload as { text?: string };
      if (typeof p.text === "string") pendingAssistantText = p.text;
    } else if (s.kind === "tool_call") {
      const p = s.payload as { tool: string; args: Record<string, unknown> };
      pendingCalls.push({
        id: toolCallId(s.idx, pendingCalls.length),
        name: p.tool,
        args: JSON.stringify(p.args),
      });
    } else if (s.kind === "observation") {
      // First observation after the call batch closes the assistant turn.
      flushAssistant();
      const p = s.payload as { observation: unknown; toolCallId?: string };
      const id =
        typeof p.toolCallId === "string" ? p.toolCallId : toolCallId(s.idx, 0);
      messages.push({
        role: "tool",
        tool_call_id: id,
        content: JSON.stringify(p.observation),
      });
    }
    // decision/error steps are trace-only; they don't reconstruct messages.
  }
  flushAssistant();
  return messages;
}

interface LoopState {
  runId: number;
  budget: RunBudget;
  totals: RunTotals;
  picksCount: number;
  nextIdx: number;
  ctx: ToolContext;
  retryCounts: Map<string, number>;
}

const usageFromResponse = (
  u: Groq.CompletionUsage | undefined,
  model: string,
): AgentStepUsage => {
  const promptTokens = u?.prompt_tokens ?? 0;
  const completionTokens = u?.completion_tokens ?? 0;
  const totalTokens = u?.total_tokens ?? promptTokens + completionTokens;
  const usage: AgentStepUsage = { promptTokens, completionTokens, totalTokens };
  usage.costUsd = costOfUsage(model, usage);
  return usage;
};

/**
 * Drive the loop from an already-built messages array. Shared by fresh starts
 * and resumes. Returns the terminal outcome; never throws for ordinary control
 * flow (budget/cancel) — only an unrecoverable fault propagates after the run
 * is finalized "failed".
 */
async function drive(
  messages: ChatMessage[],
  state: LoopState,
): Promise<RunOutcome> {
  const model = agentModel();
  const client = groqClient();

  for (;;) {
    // 1. Cancellation / pause check between steps.
    const status = await getRunStatus(state.runId);
    if (status === "cancelled") {
      return finishOutcome(state, "cancelled", null);
    }
    if (status === "paused") {
      // User paused mid-run. Leave it paused; resumeRun picks it back up. The
      // trace is fully checkpointed, so nothing to flush. Not terminal.
      return {
        runId: state.runId,
        status: "paused",
        totals: state.totals,
        picksCount: state.picksCount,
        finalText: null,
      };
    }

    // 2. Budget check before spending another model call.
    const verdict = checkBudget(state.totals, state.budget);
    if (verdict.exhausted) {
      await appendStep({
        runId: state.runId,
        idx: state.nextIdx++,
        kind: "error",
        payload: { message: `Budget exhausted: ${verdict.reason} cap reached.` },
      });
      await persistProgress(state);
      await finalizeRun({
        runId: state.runId,
        status: "failed",
        error: `budget_exhausted: ${verdict.reason}`,
      });
      return {
        runId: state.runId,
        status: "budget_exhausted",
        totals: state.totals,
        picksCount: state.picksCount,
        finalText: null,
      };
    }

    // 3. Model call, riding out transient 429s with the server-suggested wait.
    //    Free-tier TPM is small; a short backoff usually clears the window.
    let res: Groq.Chat.ChatCompletion | null = null;
    for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
      try {
        res = await client.chat.completions.create({
          model,
          temperature: TEMPERATURE,
          max_completion_tokens: MAX_COMPLETION_TOKENS,
          tools: TOOL_DEFINITIONS,
          tool_choice: "auto",
          messages,
        });
        break;
      } catch (e) {
        if (isRateLimit(e) && attempt < RATE_LIMIT_RETRIES) {
          const waitMs = retryAfterMs(e);
          await appendStep({
            runId: state.runId,
            idx: state.nextIdx++,
            kind: "error",
            payload: {
              message: `Rate limited (429). Waiting ${waitMs}ms then retrying (attempt ${attempt + 1}/${RATE_LIMIT_RETRIES}).`,
            },
          });
          await sleep(waitMs);
          continue;
        }
        if (isRateLimit(e)) throw new RateLimitExhausted(retryMessage(e));
        throw e;
      }
    }
    if (!res) throw new RateLimitExhausted("rate limit not cleared");

    state.totals.steps += 1;
    const usage = usageFromResponse(res.usage, model);
    state.totals.tokens += usage.totalTokens;
    state.totals.usd += usage.costUsd ?? 0;

    const choice = res.choices[0];
    const finish = choice?.finish_reason;
    const assistant = choice?.message;
    const toolCalls = assistant?.tool_calls ?? [];
    const text = assistant?.content ?? "";

    // 4a. Truncated mid-call → record and retry with the same messages.
    if (finish === "length" && toolCalls.length === 0) {
      await appendStep({
        runId: state.runId,
        idx: state.nextIdx++,
        kind: "error",
        payload: {
          message: "Model output truncated (length). Retrying the turn.",
        },
        usage,
      });
      await persistProgress(state);
      continue;
    }

    // 4b. No tool calls → this is the final text answer. Terminate.
    if (toolCalls.length === 0) {
      await appendStep({
        runId: state.runId,
        idx: state.nextIdx++,
        kind: "reasoning",
        payload: { text: text || "(no final text)" },
        usage,
      });
      await persistProgress(state);
      return finishOutcome(state, "completed", text || null);
    }

    // 4c. Tool calls. Persist the assistant turn (reasoning step carries any
    // text), then one tool_call step per call BEFORE executing (checkpoint).
    await appendStep({
      runId: state.runId,
      idx: state.nextIdx++,
      kind: "reasoning",
      payload: { text },
      usage,
    });

    // Push the assistant message exactly as the API returned it.
    messages.push({
      role: "assistant",
      content: text || null,
      tool_calls: toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: {
          name: c.function.name,
          arguments: c.function.arguments,
        },
      })),
    });

    // Record each tool_call step (with its real id for faithful resume).
    const callSteps: { call: (typeof toolCalls)[number]; idx: number }[] = [];
    for (const call of toolCalls) {
      const idx = state.nextIdx++;
      callSteps.push({ call, idx });
      let argsObj: Record<string, unknown> = {};
      try {
        argsObj =
          call.function.arguments.trim() === ""
            ? {}
            : (JSON.parse(call.function.arguments) as Record<string, unknown>);
      } catch {
        argsObj = { __unparsed: call.function.arguments };
      }
      const payload: AgentStepPayload & { toolCallId?: string } = {
        tool: call.function.name,
        args: argsObj,
      };
      // Stash the real id alongside (extra key tolerated by jsonb) so resume
      // pairs the observation to the right call.
      (payload as { toolCallId?: string }).toolCallId = call.id;
      await appendStep({
        runId: state.runId,
        idx,
        kind: "tool_call",
        payload,
      });
    }
    await persistProgress(state);

    // 4d. Execute ALL calls in parallel (every tool is read-only except
    // save_finding, which is an idempotent upsert — safe to parallelize).
    const outcomes = await Promise.all(
      callSteps.map(({ call }) =>
        dispatchToolCall(call.function.name, call.function.arguments, state.ctx),
      ),
    );

    // 4e. Append one observation per call (checkpoint) + the tool message.
    for (let i = 0; i < callSteps.length; i++) {
      const step = callSteps[i];
      const outcome = outcomes[i];
      if (step === undefined || outcome === undefined) continue;
      const { call } = step;
      if (outcome.newPick) state.picksCount += 1;

      // Same-call retry guard: count repeated identical failing calls.
      const isError =
        typeof outcome.result === "object" &&
        outcome.result !== null &&
        "error" in outcome.result;
      let observation: unknown = outcome.result;
      if (isError) {
        const key = `${call.function.name}:${call.function.arguments}`;
        const n = (state.retryCounts.get(key) ?? 0) + 1;
        state.retryCounts.set(key, n);
        if (n >= SAME_CALL_RETRY_CAP) {
          observation = {
            error: {
              type: "Forbidden",
              message: `This exact call failed ${n} times. Stop retrying it — try a different tool or different arguments, or finish.`,
              retryable: false,
            },
          };
        }
      }

      await appendStep({
        runId: state.runId,
        idx: state.nextIdx++,
        kind: "observation",
        payload: { observation, toolCallId: call.id } as AgentStepPayload,
      });

      // If this was a save_finding decision, also record a decision step (trace).
      if (
        call.function.name === "save_finding" &&
        typeof outcome.result === "object" &&
        outcome.result !== null &&
        "ok" in outcome.result
      ) {
        const r = outcome.result as unknown as {
          hnId: number;
          decision: string;
        };
        const args = outcome.parsedArgs as { score?: number } | null;
        await appendStep({
          runId: state.runId,
          idx: state.nextIdx++,
          kind: "decision",
          payload: {
            postingId: r.hnId,
            score: typeof args?.score === "number" ? args.score : 0,
            verdict: r.decision,
          },
        });
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(observation),
      });
    }
    await persistProgress(state);
  }
}

function finishOutcome(
  state: LoopState,
  status: Extract<TerminalStatus, "completed" | "cancelled" | "failed">,
  finalText: string | null,
): RunOutcome {
  return {
    runId: state.runId,
    status,
    totals: state.totals,
    picksCount: state.picksCount,
    finalText,
  };
}

async function persistProgress(state: LoopState): Promise<void> {
  await updateRunProgress({
    runId: state.runId,
    stepsUsed: state.totals.steps,
    costUsd: Number(state.totals.usd.toFixed(6)),
    picksCount: state.picksCount,
  });
}

/**
 * Start (or resume) the loop for a run that already has its agentRuns row. The
 * server action fires this without awaiting (returns the runId first), so this
 * owns its own error finalization — a thrown fault marks the run "failed" and
 * is swallowed, never surfaced to the (already-returned) request.
 */
export async function runLoop(
  runId: number,
  budget: RunBudget = DEFAULT_BUDGET,
): Promise<RunOutcome> {
  const ctx = await buildToolContext(runId);
  const detail = await getRun(runId);
  if (!detail) throw new Error(`run ${runId} not found`);

  // Resume: rebuild messages + totals from persisted steps. A fresh run has no
  // steps, so this yields just the system message.
  const messages =
    detail.steps.length > 0
      ? rebuildMessages(detail.steps)
      : [{ role: "system", content: SYSTEM_PROMPT } as ChatMessage];

  const nextIdx =
    detail.steps.length > 0
      ? Math.max(...detail.steps.map((s) => s.idx)) + 1
      : 0;

  const totals: RunTotals = {
    steps: detail.stepsUsed,
    tokens: detail.steps.reduce((sum, s) => sum + (s.usage?.totalTokens ?? 0), 0),
    usd: detail.costUsd,
  };

  const state: LoopState = {
    runId,
    budget,
    totals,
    picksCount: detail.picksCount,
    nextIdx,
    ctx,
    retryCounts: new Map(),
  };

  try {
    const outcome = await drive(messages, state);
    if (outcome.status === "completed") {
      await finalizeRun({ runId, status: "completed" });
    } else if (outcome.status === "cancelled") {
      await finalizeRun({ runId, status: "cancelled" });
    }
    // "paused" stays paused (set by pauseRun / the loop) so resume works.
    // "budget_exhausted" already finalized inside drive().
    return outcome;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    // A 429 the loop couldn't ride out is NOT a terminal failure: the whole
    // conversation is checkpointed, so pause the run (resumable) instead of
    // burning it. resumeRun rebuilds the messages and continues once the TPM
    // window clears.
    if (e instanceof RateLimitExhausted) {
      await appendStep({
        runId,
        idx: state.nextIdx++,
        kind: "error",
        payload: { message },
      }).catch(() => {
        // Best-effort: we're already on the pause path, nothing to recover.
      });
      await setRunStatus(runId, "paused").catch(() => {
        // Best-effort: status will be reconciled on the next resume.
      });
      return {
        runId,
        status: "paused",
        totals: state.totals,
        picksCount: state.picksCount,
        finalText: null,
      };
    }

    await appendStep({
      runId,
      idx: state.nextIdx++,
      kind: "error",
      payload: { message: `Run failed: ${message}` },
    }).catch(() => {
      // Best-effort: we're already on the failure path, nothing to recover.
    });
    await finalizeRun({ runId, status: "failed", error: message }).catch(() => {
      // Best-effort: the run is being marked failed; a write error here is moot.
    });
    return {
      runId,
      status: "failed",
      totals: state.totals,
      picksCount: state.picksCount,
      finalText: null,
    };
  }
}
