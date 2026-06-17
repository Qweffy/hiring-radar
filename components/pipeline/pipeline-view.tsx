"use client";

import { useEffect, useState } from "react";

import {
  BackfillCard,
  type BackfillMonth,
} from "@/components/pipeline/backfill-card";
import { DeadLettersPanel } from "@/components/pipeline/dead-letters-panel";
import { EmptySweeps } from "@/components/pipeline/empty-sweeps";
import { EventLog, type LogLine } from "@/components/pipeline/event-log";
import { FailedBanner } from "@/components/pipeline/failed-banner";
import { RunningSweep, type RunningStep } from "@/components/pipeline/running-sweep";
import { StatusStrip } from "@/components/pipeline/status-strip";
import { SweepsTable } from "@/components/pipeline/sweeps-table";
import  { type DeadLetterView, type SweepView } from "@/components/pipeline/types";
import  { type PipelineSummary } from "@/lib/queries/pipeline";

function fmtElapsed(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/**
 * Live "Nm SSs" elapsed. Seeds from the server-computed `initialSeconds` (so the
 * first paint is hydration-stable) and bumps one second per interval tick. The
 * interval only sets state in its callback — never synchronously in the effect.
 */
function useElapsed(initialSeconds: number | null): string {
  const [seconds, setSeconds] = useState(initialSeconds ?? 0);
  useEffect(() => {
    if (initialSeconds === null) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [initialSeconds]);
  if (initialSeconds === null) return "0m 00s";
  return fmtElapsed(seconds);
}

/** Pre-computed running-state inputs (derived server-side from the live sweep). */
export interface RunningState {
  sweep: SweepView;
  /** Seconds elapsed at request time — seeds the live counter, hydration-stable. */
  initialSeconds: number;
  steps: RunningStep[];
}

/** Pre-computed failed-state inputs (derived server-side). */
export interface FailedState {
  failedStep: string;
  errorCause: string;
  lastGoodMonth: string;
  passedSteps: string[];
}

export interface PipelineViewProps {
  summary: PipelineSummary;
  sweeps: SweepView[];
  deadLetters: DeadLetterView[];
  logLines: LogLine[];
  /** Latest thread + month, for backfill / first-ingest / resume actions. */
  latestThreadId: number | null;
  latestMonth: string | null;
  latestMonthLabel: string;
  /** Months available to backfill, newest-first (drives the range picker). */
  backfillMonths: BackfillMonth[];
  /** Postings fetched by the latest sweep (denominator for the DL summary). */
  latestFetched: number;
  /** Non-null when the latest sweep is RUNNING. */
  running: RunningState | null;
  /** Non-null when the latest sweep FAILED. */
  failed: FailedState | null;
}

/**
 * Pipeline observability screen. Server-driven: which sweep variant renders
 * (running / failed / table / empty) is decided from the latest sweep's status;
 * client state is only the accordion-open sweep and the log filter.
 */
export function PipelineView({
  summary,
  sweeps,
  deadLetters,
  logLines,
  latestThreadId,
  latestMonth,
  latestMonthLabel,
  backfillMonths,
  latestFetched,
  running,
  failed,
}: PipelineViewProps) {
  // Single-open accordion. Default: latest (first) row.
  const [expandedId, setExpandedId] = useState<number | null>(sweeps[0]?.id ?? null);
  const toggle = (id: number) =>
    setExpandedId((current) => (current === id ? null : id));

  const elapsed = useElapsed(running ? running.initialSeconds : null);

  const isEmpty = sweeps.length === 0;
  const postingEstimate = latestFetched > 0 ? latestFetched : 512;

  return (
    <div className="absolute inset-0 overflow-auto">
      <div className="flex flex-col" style={{ padding: "24px 28px", gap: 22 }}>
        {/* Route title row */}
        <header className="flex items-baseline" style={{ gap: 14, marginBottom: 18 }}>
          <span
            style={{
              font: "var(--label-mono)",
              letterSpacing: "var(--label-tracking)",
              textTransform: "uppercase",
              color: "var(--text-low)",
            }}
          >
            Admin · pipeline
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: "-0.02em",
              color: "var(--text-hi)",
            }}
          >
            Ingest pipeline
          </h1>
          <p style={{ margin: 0, font: "var(--text-sm)", color: "var(--text-low-content)" }}>
            Sweeps, embeddings, and dead letters — the machine room.
          </p>
        </header>

        {/* Failed-state banner replaces the strip emphasis */}
        {failed ? (
          <FailedBanner
            failedStep={failed.failedStep}
            errorCause={failed.errorCause}
            lastGoodMonth={failed.lastGoodMonth}
            passedSteps={failed.passedSteps}
            threadId={latestThreadId}
            month={latestMonth}
          />
        ) : null}

        <StatusStrip summary={summary} />

        {/* Running latest sweep gets the live step pipeline above the grid */}
        {running ? (
          <RunningSweep sweep={running.sweep} elapsed={elapsed} steps={running.steps} />
        ) : null}

        {/* Main 2-col grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)",
            gap: 22,
            alignItems: "start",
          }}
        >
          <div className="min-w-0">
            {isEmpty ? (
              <EmptySweeps
                threadId={latestThreadId}
                month={latestMonth}
                postingEstimate={postingEstimate}
              />
            ) : (
              <SweepsTable
                sweeps={sweeps}
                expandedId={expandedId}
                onToggle={toggle}
              />
            )}
          </div>

          <div className="flex min-w-0 flex-col" style={{ gap: 22 }}>
            <DeadLettersPanel
              items={deadLetters}
              indexed={Math.max(0, latestFetched - deadLetters.length)}
              total={latestFetched}
            />
            <BackfillCard
              months={backfillMonths}
              defaultMonth={latestMonth}
              defaultLabel={latestMonthLabel}
              threadCount={1}
              postingEstimate={postingEstimate}
            />
          </div>
        </div>

        <EventLog lines={logLines} />
      </div>
    </div>
  );
}
