import  { type CSSProperties } from "react";

import { Radial } from "@/components/agent-run/radial";
import { HRIllustration } from "@/components/ui/hr-illustration";


/**
 * Agent assessment panel for the Posting Detail view (MatchPanel.dc.html). Four
 * variants: `assessed` (score gauge + fit/friction reasons + provenance),
 * `empty` (not assessed — "Assess now"), `running` (live orb + step segments),
 * `failed` (retry). Violet-themed glass card; reasons use phosphor for fit and
 * amber for friction. Actions are passed in as callbacks so this stays
 * presentational and reusable.
 */

export interface MatchReason {
  /** '+' = fit (phosphor), '−' = friction (amber). The minus is U+2212. */
  sign: "+" | "−";
  text: string;
}

export type MatchPanelVariant = "assessed" | "empty" | "running" | "failed";

export interface MatchPanelProps {
  variant?: MatchPanelVariant;
  /** assessed: 0–100 score. */
  score?: number;
  /** assessed: fit/friction signals. */
  reasons?: MatchReason[];
  /** assessed: "Assessed by agent run #23 · 2h ago". */
  provenance?: string;
  /** running: current assessment step (1-based) and total. */
  step?: number;
  totalSteps?: number;
  onReassess?: () => void;
  onAssess?: () => void;
  onRetry?: () => void;
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 18,
  background: "var(--violet-12)",
  border: "1px solid rgba(167,139,250,0.32)",
  borderRadius: "var(--radius-card)",
  boxShadow: "0 0 24px rgba(167,139,250,0.10)",
  fontFamily: "var(--font-ui)",
};

/**
 * Self-contained styles so MatchPanel works on any route (e.g. Posting Detail)
 * without depending on the Agent Run page keyframes. Deduped by href.
 */
const MATCH_PANEL_CSS = `
@keyframes hr-orb-pulse-kf { 0%,100% { transform: scale(1); opacity: 0.92; } 50% { transform: scale(1.06); opacity: 1; } }
.hr-orb-pulse { animation: hr-orb-pulse-kf 2.2s ease-in-out infinite; }
.hr-violet-ghost { transition: background var(--dur-fast) var(--ease-out); }
.hr-violet-ghost:hover { background: var(--violet-12); }
.hr-violet-solid { transition: background var(--dur-fast) var(--ease-out); }
.hr-violet-solid:hover { background: #b9a2ff; }
@media (prefers-reduced-motion: reduce) { .hr-orb-pulse { animation: none; } }
`;

const labelStyle: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--violet)",
};

const RefreshIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <polyline points="21 3 21 9 15 9" />
  </svg>
);

const BotIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 8V4H8" />
    <rect width={16} height={12} x={4} y={8} rx={2} />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

export function MatchPanel({
  variant = "assessed",
  score = 0,
  reasons = [],
  provenance,
  step = 1,
  totalSteps = 5,
  onReassess,
  onAssess,
  onRetry,
}: MatchPanelProps) {
  return (
    <div style={containerStyle}>
      <style href="hr-match-panel" precedence="default">
        {MATCH_PANEL_CSS}
      </style>
      {variant === "assessed" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={labelStyle}>Agent match</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              font: "var(--mono-sm)",
              color: "var(--violet)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--violet)",
                boxShadow: "0 0 6px var(--violet)",
              }}
            />
            assessed
          </span>
        </div>
      )}

      {variant === "assessed" && (
        <AssessedBody
          score={score}
          reasons={reasons}
          provenance={provenance}
          onReassess={onReassess}
        />
      )}
      {variant === "empty" && <EmptyBody onAssess={onAssess} />}
      {variant === "running" && <RunningBody step={step} totalSteps={totalSteps} />}
      {variant === "failed" && <FailedBody onRetry={onRetry} />}
    </div>
  );
}

function AssessedBody({
  score,
  reasons,
  provenance,
  onReassess,
}: {
  score: number;
  reasons: MatchReason[];
  provenance?: string;
  onReassess?: () => void;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Radial
          size={84}
          radius={38}
          strokeWidth={8}
          value={score / 100}
          trackColor="rgba(167,139,250,0.16)"
          progressColor="var(--violet)"
          glow="rgba(167,139,250,0.45)"
        >
          <span style={{ font: "var(--mono-lg)", color: "var(--text-hi)", lineHeight: 1 }}>
            {score}
          </span>
          <span
            style={{
              font: "600 9px/1 var(--font-mono)",
              letterSpacing: "0.1em",
              color: "var(--text-low)",
            }}
          >
            MATCH
          </span>
        </Radial>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
          {reasons.map((reason, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <span style={signIconStyle(reason.sign === "+")} aria-hidden="true">
                {reason.sign}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  font: "var(--text-sm)",
                  color: "var(--text-mid)",
                  lineHeight: 1.4,
                }}
              >
                {reason.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 12,
          borderTop: "1px solid rgba(167,139,250,0.2)",
        }}
      >
        <span
          style={{
            font: "var(--label-mono)",
            letterSpacing: "var(--label-tracking)",
            textTransform: "uppercase",
            color: "var(--text-low)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {provenance ?? "Assessed by agent"}
        </span>
        <button
          type="button"
          onClick={onReassess}
          className="hr-violet-ghost"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 28,
            padding: "0 11px",
            flexShrink: 0,
            whiteSpace: "nowrap",
            background: "transparent",
            border: "1px solid rgba(167,139,250,0.4)",
            borderRadius: "var(--radius-control)",
            color: "var(--violet)",
            font: "600 11px/1 var(--font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          <RefreshIcon size={13} />
          Re-assess
        </button>
      </div>
    </>
  );
}

function EmptyBody({ onAssess }: { onAssess?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 10,
        padding: "14px 8px",
      }}
    >
      <HRIllustration name="agent-orb-idle" size={64} />
      <span style={{ font: "600 15px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
        Not assessed yet
      </span>
      <span style={{ font: "var(--text-sm)", color: "var(--text-mid)", maxWidth: 280 }}>
        Ask the agent to score this posting against your profile.
      </span>
      <button
        type="button"
        onClick={onAssess}
        className="hr-violet-solid"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          height: 36,
          padding: "0 16px",
          marginTop: 4,
          background: "var(--violet)",
          border: "1px solid transparent",
          borderRadius: "var(--radius-control)",
          color: "#160A2E",
          font: "600 13px/1 var(--font-ui)",
          cursor: "pointer",
          boxShadow: "var(--glow-violet)",
        }}
      >
        <BotIcon size={16} />
        Assess now
      </button>
    </div>
  );
}

function RunningBody({ step, totalSteps }: { step: number; totalSteps: number }) {
  const segments = Array.from({ length: totalSteps }, (_, i) => i < step);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12,
        padding: "14px 8px",
      }}
    >
      <div className="hr-orb-pulse" style={{ display: "flex" }}>
        <HRIllustration name="agent-orb-active" size={64} />
      </div>
      <span style={{ font: "600 15px/1.3 var(--font-ui)", color: "var(--violet)" }}>
        Agent assessing…
      </span>
      <span style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>
        step {step} / {totalSteps} · scoring against your profile
      </span>
      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        {segments.map((filled, i) => (
          <span
            key={i}
            style={{
              width: 26,
              height: 4,
              borderRadius: 2,
              background: filled ? "var(--violet)" : "rgba(167,139,250,0.22)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FailedBody({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 10,
        padding: "14px 8px",
      }}
    >
      <HRIllustration name="static-interference" size={76} />
      <span style={{ font: "600 15px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
        Assessment failed — model unavailable
      </span>
      <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
        the rest of the posting is unaffected
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="hr-violet-ghost"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          height: 36,
          padding: "0 14px",
          marginTop: 4,
          background: "transparent",
          border: "1px solid rgba(167,139,250,0.45)",
          borderRadius: "var(--radius-control)",
          color: "var(--violet)",
          font: "600 13px/1 var(--font-ui)",
          cursor: "pointer",
        }}
      >
        <RefreshIcon size={15} />
        Retry assessment
      </button>
    </div>
  );
}

function signIconStyle(positive: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 18,
    height: 18,
    marginTop: 1,
    borderRadius: "var(--radius-sm)",
    font: "700 13px/1 var(--font-mono)",
    color: positive ? "var(--phosphor)" : "var(--amber)",
    background: positive ? "var(--phosphor-12)" : "var(--amber-14)",
    border: `1px solid ${positive ? "var(--border-strong)" : "rgba(255,200,87,0.38)"}`,
  };
}
