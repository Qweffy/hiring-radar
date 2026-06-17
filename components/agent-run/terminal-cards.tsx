import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner } from "@/components/ui/spinner";

/**
 * The terminal timeline cards that close out a finished run's trace: the
 * phosphor "Run complete" card, the red failure card with its resume bar, the
 * amber budget-exhausted card, and the dimmed cancelled card. Each sits on a
 * terminal rail (the connector stops at the dot, no continuation below).
 * Verbatim from Agent Run.dc.html states 02–07.
 */

const railWrap: CSSProperties = {
  position: "relative",
  width: 22,
  flexShrink: 0,
};

/** Terminal rail: line runs in from above and stops at the dot. */
function TerminalRail({ dot, glow }: { dot: string; glow: boolean }) {
  return (
    <div style={railWrap}>
      <div
        style={{
          position: "absolute",
          left: 10,
          top: -20,
          bottom: "50%",
          width: 2,
          background: "rgba(167,139,250,0.26)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 4,
          top: 16,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: dot,
          border: "2px solid var(--bg-void)",
          boxShadow: glow ? `0 0 8px ${dot}` : "none",
        }}
      />
    </div>
  );
}

const AlertTriangle = ({ size, color }: { size: number; color: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
    aria-hidden="true"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

function TerminalRow({ dot, glow, children }: { dot: string; glow: boolean; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <TerminalRail dot={dot} glow={glow} />
      {children}
    </div>
  );
}

/** STATE 02 — completed: "Run complete" + View shortlist. */
export function CompletedCard({
  shortlisted,
  scanned,
  steps,
  costLabel,
}: {
  shortlisted: number;
  scanned: number | null;
  steps: number;
  costLabel: string;
}) {
  const scannedLabel = scanned !== null ? `${scanned} scanned` : "scanned";
  return (
    <TerminalRow dot="var(--phosphor)" glow>
      <div
        style={{
          flex: 1,
          padding: "16px 18px",
          background: "var(--phosphor-08)",
          border: "1px solid var(--border-strong)",
          borderLeft: "3px solid var(--phosphor)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div style={{ font: "600 15px/1.3 var(--font-ui)", color: "var(--text-hi)", marginBottom: 6 }}>
          Run complete
        </div>
        <div style={{ font: "var(--mono-sm)", color: "var(--text-mid)", marginBottom: 14 }}>
          {shortlisted} shortlisted of {scannedLabel} · {steps} steps · {costLabel}
        </div>
        <Link href="/shortlist" style={{ textDecoration: "none" }}>
          <Button variant="primary" iconLeft="bookmark">
            View shortlist
          </Button>
        </Link>
      </div>
    </TerminalRow>
  );
}

/** STATE 05 — budget exhausted (amber terminal card). */
export function BudgetExhaustedCard({
  stepBudget,
  picks,
}: {
  stepBudget: number;
  picks: number;
}) {
  return (
    <TerminalRow dot="var(--amber)" glow>
      <div
        style={{
          flex: 1,
          padding: "16px 18px",
          background: "var(--amber-14)",
          border: "1px solid rgba(255,200,87,0.32)",
          borderLeft: "3px solid var(--amber)",
          borderRadius: "var(--radius-card)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <span style={{ marginTop: 1 }}>
          <AlertTriangle size={18} color="var(--amber)" />
        </span>
        <div>
          <div style={{ font: "600 14px/1.4 var(--font-ui)", color: "var(--text-hi)" }}>
            Step budget reached ({stepBudget}/{stepBudget}) — stopping with {picks} pick
            {picks === 1 ? "" : "s"}.
          </div>
          <div style={{ font: "var(--mono-sm)", color: "var(--text-low-content)", marginTop: 6 }}>
            Raise the cap in Settings to scan deeper.
          </div>
        </div>
      </div>
    </TerminalRow>
  );
}

/** STATE 03 — failed mid-run: red card + resume bar. */
export function FailedCard({
  message,
  stepsUsed,
  stepBudget,
  onResume,
  pending,
}: {
  message: string;
  stepsUsed: number;
  stepBudget: number;
  onResume: () => void;
  pending: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TerminalRow dot="var(--red)" glow>
        <div
          style={{
            flex: 1,
            padding: "14px 16px",
            background: "var(--red-14)",
            border: "1px solid rgba(255,93,93,0.32)",
            borderLeft: "3px solid var(--red)",
            borderRadius: "var(--radius-card)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertTriangle size={16} color="var(--red)" />
          <span style={{ font: "var(--mono-sm)", color: "var(--red)" }}>{message}</span>
        </div>
      </TerminalRow>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-control)",
        }}
      >
        <StatusBadge status="FAILED" />
        <span style={{ flex: 1, font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
          state persisted · step {stepsUsed}/{stepBudget}
        </span>
        <Button variant="primary" iconLeft="play" onClick={onResume} loading={pending}>
          Resume from step {stepsUsed}
        </Button>
      </div>
    </div>
  );
}

/** STATE 07 — cancelled: dimmed grey card + footnote. */
export function CancelledCard({
  stepsUsed,
  picks,
}: {
  stepsUsed: number;
  picks: number;
}) {
  return (
    <div>
      <TerminalRow dot="var(--text-low)" glow={false}>
        <div
          style={{
            flex: 1,
            padding: "14px 16px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            opacity: 0.6,
          }}
        >
          <span style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>
            Cancelled by user at step {stepsUsed} — {picks} pick{picks === 1 ? "" : "s"} kept.
          </span>
        </div>
      </TerminalRow>
      <div
        style={{
          font: "var(--mono-sm)",
          color: "var(--text-low-content)",
          marginTop: 14,
          paddingLeft: 36,
        }}
      >
        Picks so far remain in your shortlist.
      </div>
    </div>
  );
}

/** STATE 06 — paused notice bar (shown above the trace when paused). */
export function PausedNotice({ stepsUsed }: { stepsUsed: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "var(--amber-14)",
        border: "1px solid rgba(255,200,87,0.32)",
        borderRadius: "var(--radius-control)",
        marginBottom: 16,
      }}
    >
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--amber)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        <rect x={14} y={4} width={4} height={16} rx={1} />
        <rect x={6} y={4} width={4} height={16} rx={1} />
      </svg>
      <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-hi)" }}>
        Run paused at step {stepsUsed}.
      </span>
    </div>
  );
}

/** STATE 08 — feed-lost reconnect banner (shown above the trace). */
export function FeedLostBanner({ retry }: { retry: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 16px",
        background: "var(--amber-14)",
        border: "1px solid rgba(255,200,87,0.3)",
        borderRadius: "var(--radius-control)",
        marginBottom: 16,
      }}
      aria-live="polite"
    >
      <Spinner size={16} color="var(--amber)" />
      <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-hi)" }}>
        Live feed lost — reconnecting…
      </span>
      <span style={{ font: "var(--mono-sm)", color: "var(--amber)" }}>retry {retry}</span>
    </div>
  );
}
