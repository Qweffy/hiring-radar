"use client";

import { useEffect, useRef, useState } from "react";

import  { type AgentStepPayload, type AgentStepUsage } from "@/db/schema";
import  {
  type AgentRunStatus,
  type AgentStepKind,
  type AgentStepRow,
} from "@/lib/queries/agent-runs";

/**
 * Subscribe to a run's live SSE trace (/api/agent/[runId]/stream). The route
 * tails agentSteps by idx and emits `step` / `head` / `done` / `timeout` /
 * `error`; this hook accumulates steps (deduped by idx), tracks the run status,
 * and surfaces a connection state so the UI can show the "feed lost —
 * reconnecting" banner. On a clean `timeout` or a transport drop it reconnects
 * from the last seen idx (?afterIdx=) and backfills, exactly as the route
 * contract intends.
 *
 * Only mounts a stream for non-terminal runs — a finished run is fully rendered
 * server-side and never needs a live feed.
 */

export type FeedState = "connecting" | "live" | "lost";

interface StepEventData {
  idx: number;
  kind: AgentStepKind;
  payload: AgentStepPayload;
  usage: AgentStepUsage | null;
  createdAt: string;
}

export interface RunStream {
  steps: AgentStepRow[];
  status: AgentRunStatus | null;
  feed: FeedState;
  /** Reconnect attempts since the feed was last healthy. */
  retry: number;
  /** True once a terminal `done` arrived — the parent refreshes server data. */
  finished: boolean;
}

const TERMINAL: ReadonlySet<string> = new Set(["completed", "failed", "cancelled"]);
/** Backoff before re-opening the stream after a drop, capped. */
const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 6000;

export function useRunStream(
  runId: number,
  initialSteps: AgentStepRow[],
  initialStatus: AgentRunStatus,
  enabled: boolean,
): RunStream {
  const [steps, setSteps] = useState<AgentStepRow[]>(initialSteps);
  const [status, setStatus] = useState<AgentRunStatus | null>(initialStatus);
  // A terminal run never opens a stream — it's already "live" (fully rendered).
  const [feed, setFeed] = useState<FeedState>(enabled ? "connecting" : "live");
  const [retry, setRetry] = useState(0);
  const [finished, setFinished] = useState(false);

  const lastIdxRef = useRef(
    initialSteps.length > 0 ? Math.max(...initialSteps.map((s) => s.idx)) : -1,
  );
  const retryRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let closed = false;

    const appendStep = (data: StepEventData): void => {
      if (data.idx <= lastIdxRef.current) return; // dedupe / out-of-order guard
      lastIdxRef.current = data.idx;
      const row: AgentStepRow = {
        // The live feed has no row id; idx is unique per run and is all the UI
        // keys on. Use idx as a stable surrogate id for the optimistic row.
        id: data.idx,
        runId,
        idx: data.idx,
        kind: data.kind,
        payload: data.payload,
        usage: data.usage,
        createdAt: new Date(data.createdAt),
      };
      setSteps((prev) => [...prev, row]);
    };

    const scheduleReconnect = (): void => {
      if (closed) return;
      source?.close();
      source = null;
      setFeed("lost");
      retryRef.current += 1;
      setRetry(retryRef.current);
      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * retryRef.current,
      );
      reconnectTimer = window.setTimeout(open, delay);
    };

    function open(): void {
      if (closed) return;
      const url = `/api/agent/${runId}/stream?afterIdx=${lastIdxRef.current}`;
      const es = new EventSource(url);
      source = es;

      es.onopen = () => {
        if (closed) return;
        retryRef.current = 0;
        setRetry(0);
        setFeed("live");
      };

      // EventSource dispatches MessageEvent for named events; typing the param
      // gives event.data the correct `string` type (vs. the generic Event's `any`).
      es.addEventListener("step", (event: MessageEvent<string>) => {
        try {
          appendStep(JSON.parse(event.data) as StepEventData);
          setFeed("live");
        } catch {
          // A malformed frame is non-fatal — skip it, keep the stream open.
        }
      });

      es.addEventListener("head", (event: MessageEvent<string>) => {
        try {
          const { status: s } = JSON.parse(event.data) as {
            status: string;
          };
          if (s !== "unknown") setStatus(s as AgentRunStatus);
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("done", (event: MessageEvent<string>) => {
        try {
          const { status: s } = JSON.parse(event.data) as {
            status: string;
          };
          if (s !== "unknown") setStatus(s as AgentRunStatus);
        } catch {
          /* ignore */
        }
        closed = true;
        es.close();
        source = null;
        setFeed("live");
        setFinished(true);
      });

      // A clean server timeout closes the connection telling us where to resume.
      es.addEventListener("timeout", () => {
        es.close();
        source = null;
        // Resume immediately from the last idx — not a "lost" feed, just a
        // connection recycle; keep it quiet for the user.
        if (!closed) open();
      });

      // Transport-level error (network drop, server 5xx). EventSource would
      // normally auto-retry, but we manage backoff + the "lost" banner ourselves.
      es.onerror = () => {
        if (closed) return;
        if (TERMINAL.has(String(status))) {
          closed = true;
          es.close();
          return;
        }
        scheduleReconnect();
      };
    }

    open();

    return () => {
      closed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      source?.close();
    };
    // Re-subscribe only when the target run or enablement changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, enabled]);

  return { steps, status, feed, retry, finished };
}
