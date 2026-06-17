import type { CSSProperties } from "react";
import type { AgentRunStatus } from "@/lib/queries/agent-runs";
import type { FeedState } from "@/components/agent-run/use-run-stream";

/**
 * The trace-header status marker. While the run is RUNNING and the feed is
 * connected it shows the pulsing phosphor LIVE pill; otherwise it reflects the
 * terminal/paused state (or hides while the feed is lost, per spec — the
 * feed-lost banner takes over). Mirrors the LIVE pill in Agent Run.dc.html.
 */
export interface LiveIndicatorProps {
  status: AgentRunStatus;
  feed: FeedState;
}

const pillBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  font: "600 11px/1 var(--font-mono)",
  letterSpacing: "0.14em",
  padding: "5px 10px",
  borderRadius: "var(--radius-sm)",
};

export function LiveIndicator({ status, feed }: LiveIndicatorProps) {
  // Feed lost while running → hide the pill; the reconnect banner is shown
  // elsewhere and the spec wants LIVE hidden during a lost feed.
  if (status === "running" && feed === "lost") return null;

  if (status === "running") {
    return (
      <span
        style={{
          ...pillBase,
          color: "var(--phosphor)",
          background: "var(--phosphor-08)",
          border: "1px solid var(--border-strong)",
        }}
        aria-live="polite"
      >
        <span style={{ position: "relative", width: 7, height: 7 }} aria-hidden="true">
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "var(--phosphor)",
            }}
          />
          <span
            className="hr-dotr"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "var(--phosphor)",
            }}
          />
        </span>
        LIVE
      </span>
    );
  }

  if (status === "paused") {
    return (
      <span
        style={{
          ...pillBase,
          letterSpacing: "0.1em",
          color: "var(--amber)",
          background: "var(--amber-14)",
          border: "1px solid rgba(255,200,87,0.38)",
        }}
        aria-live="polite"
      >
        <svg
          width={11}
          height={11}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x={14} y={4} width={4} height={16} rx={1} />
          <rect x={6} y={4} width={4} height={16} rx={1} />
        </svg>
        PAUSED
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span
        style={{
          ...pillBase,
          letterSpacing: "0.1em",
          color: "var(--phosphor)",
          background: "var(--phosphor-08)",
          border: "1px solid var(--border-strong)",
        }}
        aria-live="polite"
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        COMPLETED
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span
        style={{
          ...pillBase,
          letterSpacing: "0.1em",
          color: "var(--red)",
          background: "var(--red-14)",
          border: "1px solid rgba(255,93,93,0.42)",
        }}
        aria-live="polite"
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
        FAILED
      </span>
    );
  }

  // cancelled
  return (
    <span
      style={{
        ...pillBase,
        letterSpacing: "0.1em",
        color: "var(--text-low-content)",
        background: "transparent",
        border: "1px solid var(--border)",
      }}
      aria-live="polite"
    >
      CANCELLED
    </span>
  );
}
