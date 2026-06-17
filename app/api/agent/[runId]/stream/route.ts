import {
  getRunHead,
  getStepsAfter,
  type AgentStepRow,
} from "@/lib/queries/agent-runs";

/**
 * Live trace transport for a run, over Server-Sent Events.
 *
 * Why SSE (and why a DB tail rather than an in-process event bus): the loop runs
 * detached server-side and persists every step to agentSteps BEFORE its next
 * action (the durability checkpoint). The simplest robust way to surface that
 * live is to TAIL the same table the loop writes — poll agentSteps by idx,
 * emit each new row as one SSE `event: step`, and close on a terminal status.
 * This needs no shared memory between the loop and the request (they may even be
 * different serverless invocations), survives a reconnect (the client passes its
 * last seen idx via ?afterIdx=), and degrades to plain polling if SSE is blocked.
 *
 * Events: `step` (one agentSteps row, JSON), `head` (status heartbeat), `done`
 * (terminal — the run finished/failed/cancelled). The stream closes after `done`.
 */

const POLL_MS = 700;
// Absolute ceiling so a wedged run can't hold a connection forever. The client
// reconnects (EventSource auto-retries) and resumes from its last idx.
const MAX_STREAM_MS = 110_000;

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function stepEvent(s: AgentStepRow): string {
  return sse("step", {
    idx: s.idx,
    kind: s.kind,
    payload: s.payload,
    usage: s.usage,
    createdAt: s.createdAt,
  });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const { runId: runIdRaw } = await ctx.params;
  const runId = Number(runIdRaw);
  if (!Number.isInteger(runId) || runId <= 0) {
    return new Response("Invalid run id", { status: 400 });
  }

  const head = await getRunHead(runId);
  if (!head) return new Response("No such run", { status: 404 });

  const url = new URL(req.url);
  const afterParam = Number(url.searchParams.get("afterIdx"));
  let afterIdx = Number.isInteger(afterParam) ? afterParam : -1;

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string): void => {
        controller.enqueue(encoder.encode(chunk));
      };

      // Flush whatever already exists so a late subscriber catches up at once.
      try {
        for (;;) {
          const newSteps = await getStepsAfter(runId, afterIdx);
          for (const s of newSteps) {
            send(stepEvent(s));
            afterIdx = s.idx;
          }

          const h = await getRunHead(runId);
          send(sse("head", { status: h?.status ?? "unknown" }));

          if (!h || TERMINAL.has(h.status)) {
            // Drain any final steps that landed alongside the status flip.
            const tail = await getStepsAfter(runId, afterIdx);
            for (const s of tail) {
              send(stepEvent(s));
              afterIdx = s.idx;
            }
            send(sse("done", { status: h?.status ?? "unknown", afterIdx }));
            controller.close();
            return;
          }

          if (Date.now() - startedAt > MAX_STREAM_MS) {
            // Tell the client where to resume and let EventSource reconnect.
            send(sse("timeout", { afterIdx }));
            controller.close();
            return;
          }

          if (req.signal.aborted) {
            controller.close();
            return;
          }

          await new Promise((r) => setTimeout(r, POLL_MS));
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "stream error";
        send(sse("error", { message }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering so events flush as they're produced.
      "X-Accel-Buffering": "no",
    },
  });
}
