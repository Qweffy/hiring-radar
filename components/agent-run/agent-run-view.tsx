"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { cancelRun, pauseRun, resumeRun } from "@/app/(app)/agent/actions";
import { AgentRunKeyframes } from "@/components/agent-run/agent-run-keyframes";
import { AutoscrollToggle } from "@/components/agent-run/autoscroll-toggle";
import { CancelModal } from "@/components/agent-run/cancel-modal";
import {
  HistoryCard,
  type HistoryRow,
} from "@/components/agent-run/history-card";
import { LiveIndicator } from "@/components/agent-run/live-indicator";
import {
  PausedControls,
  PicksCard,
  RunningControls,
} from "@/components/agent-run/picks-card";
import { formatElapsed, statusBadge, usd } from "@/components/agent-run/run-format";
import { StatusCard } from "@/components/agent-run/status-card";
import {
  BudgetExhaustedCard,
  CancelledCard,
  CompletedCard,
  FailedCard,
  FeedLostBanner,
  PausedNotice,
} from "@/components/agent-run/terminal-cards";
import { mapTrace } from "@/components/agent-run/trace-mapper";
import { TraceStep } from "@/components/agent-run/trace-step";
import { useRunStream } from "@/components/agent-run/use-run-stream";
import  {
  type AgentRunStatus,
  type AgentStepRow,
  type RunPick,
} from "@/lib/queries/agent-runs";

/**
 * The live Agent Run screen — left trace timeline + right status panel, wired
 * to the SSE feed for a running/paused run and to the pause/cancel/resume
 * server actions. Terminal runs render fully from server data with no live
 * feed. Lays out inside the app shell's content slot (the layout already
 * provides nav/topbar), filling it absolutely per the design's two-column frame.
 */

const TERMINAL: ReadonlySet<AgentRunStatus> = new Set([
  "completed",
  "failed",
  "cancelled",
]);

export interface AgentRunViewProps {
  runId: number;
  status: AgentRunStatus;
  /** "budget" → the run failed because the step/cost cap tripped. */
  endReason: "budget" | "error" | null;
  startedAtUtc: string;
  /** Whole seconds elapsed at first render (server-computed). */
  initialElapsedSec: number;
  stepBudget: number;
  stepsUsed: number;
  costUsd: number;
  costBudget: number;
  model: string;
  /** Final-state numbers for the completed card. */
  scanned: number | null;
  errorMessage: string | null;
  steps: AgentStepRow[];
  picks: RunPick[];
  history: HistoryRow[];
}

export function AgentRunView(props: AgentRunViewProps) {
  const router = useRouter();
  const live = !TERMINAL.has(props.status);

  const stream = useRunStream(props.runId, props.steps, props.status, live);
  const status = stream.status ?? props.status;
  const steps = stream.steps;

  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [autoscroll, setAutoscroll] = useState(true);

  // Elapsed clock — ticks each second while the run is live; frozen otherwise.
  const [elapsedSec, setElapsedSec] = useState(props.initialElapsedSec);
  useEffect(() => {
    if (TERMINAL.has(status)) return;
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // When the stream reports a terminal `done`, pull fresh server data (final
  // totals, picks, history, terminal card).
  useEffect(() => {
    if (stream.finished) router.refresh();
  }, [stream.finished, router]);

  const traceRef = useRef<HTMLDivElement>(null);
  const trace = useMemo(
    () => mapTrace(steps, !TERMINAL.has(status)),
    [steps, status],
  );

  // Autoscroll: pin to bottom on new steps while the toggle is on.
  useEffect(() => {
    if (!autoscroll) return;
    const el = traceRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [trace.length, autoscroll]);

  const runAction = (
    action: () => Promise<{ ok: boolean }>,
    after?: () => void,
  ): void => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        after?.();
        router.refresh();
      }
    });
  };

  const onPause = (): void => runAction(() => pauseRun(props.runId));
  const onResume = (): void => runAction(() => resumeRun(props.runId));
  const onConfirmCancel = (): void =>
    runAction(() => cancelRun(props.runId), () => setCancelOpen(false));

  const badge = statusBadge(status);
  const elapsed = formatElapsed(elapsedSec);
  const feedLost = live && stream.feed === "lost";

  const controls =
    status === "paused" ? (
      <PausedControls onResume={onResume} onCancel={() => setCancelOpen(true)} pending={pending} />
    ) : status === "running" ? (
      <RunningControls onPause={onPause} onCancel={() => setCancelOpen(true)} pending={pending} />
    ) : null;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", gap: 22, padding: "22px 24px" }}>
      <AgentRunKeyframes />

      {/* LEFT — TRACE */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 17,
              color: "var(--text-hi)",
            }}
          >
            Trace
          </span>
          <span style={{ flex: 1 }} />
          <AutoscrollToggle on={autoscroll} onToggle={() => setAutoscroll((v) => !v)} />
          <LiveIndicator status={status} feed={stream.feed} />
        </div>

        <div
          ref={traceRef}
          style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 6 }}
          aria-live="polite"
          aria-busy={live || undefined}
        >
          {status === "paused" && <PausedNotice stepsUsed={props.stepsUsed} />}
          {feedLost && <FeedLostBanner retry={stream.retry} />}

          {trace.map((step) => (
            <TraceStep key={step.key} step={step} />
          ))}

          {status === "completed" && (
            <CompletedCard
              shortlisted={props.picks.length}
              scanned={props.scanned}
              steps={props.stepsUsed}
              costLabel={usd(props.costUsd)}
            />
          )}
          {status === "failed" && props.endReason === "budget" && (
            <BudgetExhaustedCard stepBudget={props.stepBudget} picks={props.picks.length} />
          )}
          {status === "failed" && props.endReason !== "budget" && (
            <FailedCard
              message={
                props.errorMessage ??
                `Run halted at step ${props.stepsUsed}`
              }
              stepsUsed={props.stepsUsed}
              stepBudget={props.stepBudget}
              onResume={onResume}
              pending={pending}
            />
          )}
          {status === "cancelled" && (
            <CancelledCard stepsUsed={props.stepsUsed} picks={props.picks.length} />
          )}
        </div>
      </div>

      {/* RIGHT — STATUS */}
      <div
        style={{
          width: 372,
          flexShrink: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <StatusCard
          runId={props.runId}
          badge={badge}
          startedAt={props.startedAtUtc}
          elapsed={elapsed}
          stepsUsed={props.stepsUsed}
          stepBudget={props.stepBudget}
          costUsd={props.costUsd}
          costBudget={props.costBudget}
          model={props.model}
        />
        <PicksCard picks={props.picks} controls={controls} />
        <HistoryCard rows={props.history} />
      </div>

      <CancelModal
        open={cancelOpen}
        runId={props.runId}
        picksCount={props.picks.length}
        pending={pending}
        onClose={() => setCancelOpen(false)}
        onConfirm={onConfirmCancel}
      />
    </div>
  );
}
