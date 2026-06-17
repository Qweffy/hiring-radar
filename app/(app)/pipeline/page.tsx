import { ForbiddenView } from "@/components/auth/forbidden-view";
import { SignOutButton } from "@/components/auth/sign-out-button";
import  { type LogLevel, type LogLine } from "@/components/pipeline/event-log";
import {
  PipelineView,
  type FailedState,
  type RunningState,
} from "@/components/pipeline/pipeline-view";
import  { type RunningStep } from "@/components/pipeline/running-sweep";
import { toDeadLetterView, toSweepView } from "@/components/pipeline/types";
import { verifySession } from "@/lib/auth";
import {
  eventTime,
  getAvailableMonths,
  getDeadLetters,
  getEventLog,
  getPipelineSummary,
  getSweeps,
  type PipelineEvent,
  type SweepRow,
} from "@/lib/queries/pipeline";

// Pipeline reads live counters + the embedding index on every request; never
// statically cache it. (Browse/Radar do the same — admin chrome is dynamic.)
export const dynamic = "force-dynamic";

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const name = MONTH_ABBR[(m ?? 1) - 1] ?? "—";
  return `${name} ${y ?? ""}`;
}

/** "May" — title-cased single month name from a "YYYY-MM" string. */
function monthName(month: string): string {
  const [, m] = month.split("-").map(Number);
  const name = MONTH_ABBR[(m ?? 1) - 1] ?? "—";
  return name.charAt(0) + name.slice(1).toLowerCase();
}

const EVENT_LEVEL: Record<PipelineEvent["kind"], LogLevel> = {
  completed: "INFO",
  running: "INFO",
  partial: "WARN",
  failed: "ERROR",
  "dead-letter": "ERROR",
};

function toLogLine(event: PipelineEvent): LogLine {
  return {
    id: event.id,
    ts: eventTime(event),
    level: EVENT_LEVEL[event.kind],
    msg: event.text,
  };
}

/** Derive the in-flight step pipeline for a RUNNING sweep from its counters. */
function runningSteps(s: SweepRow): RunningStep[] {
  // We can't know the exact stage mid-run, so infer phase from counters:
  // fetched>0 → fetch done; parsed>0 → parse done/active; etc. Conservative.
  const names = ["fetch", "parse", "diff", "embed", "index"] as const;
  const doneThrough =
    s.parsedCount > 0 ? (s.newCount + s.updatedCount > 0 ? 3 : 1) : s.fetchedCount > 0 ? 1 : 0;
  return names.map((name, index) => ({
    name,
    phase: index < doneThrough ? "done" : index === doneThrough ? "active" : "pending",
  }));
}

export default async function PipelinePage() {
  // Defense-in-depth: the proxy gate already rewrites unauthenticated requests
  // to /login, but a matcher refactor must never silently expose this page
  // (Next 16 data-security guidance — verify in the route, not only the proxy).
  if (!(await verifySession())) return <ForbiddenView />;

  const [summary, sweepRows, deadLetterResult, events, monthRows] =
    await Promise.all([
      getPipelineSummary(),
      getSweeps(5),
      getDeadLetters(50),
      getEventLog(30),
      getAvailableMonths(),
    ]);

  // Newest month first; attach the human label the picker renders.
  const backfillMonths = monthRows
    .slice()
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((m) => ({ ...m, label: monthLabel(m.month) }));

  const sweeps = sweepRows.map(toSweepView);
  const deadLetters = deadLetterResult.rows.map(toDeadLetterView);
  const logLines = events.map(toLogLine);

  const latest = sweepRows[0] ?? null;
  const latestSweepView = sweeps[0] ?? null;
  const latestThreadId = latest?.threadId ?? null;
  const latestMonth = latest?.month ?? null;
  const latestMonthLabel = latest ? monthLabel(latest.month) : "—";
  const latestFetched = latest?.fetchedCount ?? 0;

  // Variant selection driven by the latest sweep's status.
  let running: RunningState | null = null;
  let failed: FailedState | null = null;

  if (latest?.status === "running" && latestSweepView) {
    running = {
      sweep: latestSweepView,
      initialSeconds: summary.runningElapsedSeconds ?? 0,
      steps: runningSteps(latest),
    };
  } else if (latest?.status === "failed") {
    // Last good month = the most recent non-failed sweep before this one.
    const lastGood = sweepRows.find((s) => s.status !== "failed");
    failed = {
      failedStep: "embed",
      errorCause: latest.error ? latest.error.slice(0, 40) : "pipeline error",
      lastGoodMonth: lastGood ? monthName(lastGood.month) : monthName(latest.month),
      passedSteps: ["fetch", "parse", "diff"],
    };
  }

  return (
    <>
      <div
        className="absolute"
        style={{ top: 14, right: 18, zIndex: "var(--z-sticky)" }}
      >
        <SignOutButton />
      </div>
      <PipelineView
        summary={summary}
        sweeps={sweeps}
        deadLetters={deadLetters}
        logLines={logLines}
        latestThreadId={latestThreadId}
        latestMonth={latestMonth}
        latestMonthLabel={latestMonthLabel}
        backfillMonths={backfillMonths}
        latestFetched={latestFetched}
        running={running}
        failed={failed}
      />
    </>
  );
}
