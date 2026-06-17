"use client";

import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";
import type { ProfileFormState } from "@/components/profile/types";

interface Criterion {
  label: string;
  val: string;
}

/**
 * Live weighted criteria derived from the form. TypeScript depth / AI product
 * experience / early-stage fit are fixed weights; the remote row flips
 * 0.75↔0.6 with the policy and the salary row's LABEL interpolates the floor.
 */
function deriveCriteria(form: ProfileFormState): Criterion[] {
  return [
    { label: "TypeScript depth", val: "0.9" },
    { label: "AI product experience", val: "0.8" },
    {
      label: "Remote + UTC-3 overlap",
      val: form.remote === "remote" ? "0.75" : "0.6",
    },
    { label: `Salary ≥ $${form.salary}k`, val: "0.7" },
    { label: "Early-stage fit", val: "0.5" },
  ];
}

const VIOLET_LABEL: CSSProperties = {
  font: "600 11px/1 var(--font-mono)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--violet)",
};

const BLOCK_LABEL: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

interface PreviewPanelProps {
  form: ProfileFormState;
  /** The agent's self-description — the saved summary, regenerated on save. */
  narrative: string;
  /** Profile version shown in the audit footer. */
  version: number;
  /** Agent run that consumed this version (null if none yet). */
  lastRunId: number | null;
  /** True while the sweep is mid-flight (the 420ms recalc cue). */
  shimmer: boolean;
  onSave: () => void;
  saving: boolean;
}

/**
 * "How the agent sees you" — the violet AI preview. Narrative + live weighted
 * criteria + a representative test-match score, with the version/audit footer
 * and Save & re-run action. A violet ping sweep overlays on every edit.
 */
export function PreviewPanel({
  form,
  narrative,
  version,
  lastRunId,
  shimmer,
  onSave,
  saving,
}: PreviewPanelProps) {
  const criteria = deriveCriteria(form);
  const runLabel = lastRunId != null ? `#${lastRunId}` : "—";

  return (
    <div
      style={{
        position: "relative",
        padding: 20,
        background: "var(--violet-12)",
        border: "1px solid rgba(167,139,250,0.32)",
        borderRadius: "var(--radius-card)",
        boxShadow: "0 0 28px rgba(167,139,250,0.10)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <HRIllustration name="agent-orb-idle" size={30} />
        <span style={VIOLET_LABEL}>How the agent sees you</span>
      </div>

      {/* Narrative */}
      <p
        style={{
          margin: "0 0 18px",
          font: "14px/1.6 var(--font-ui)",
          color: "var(--text-mid)",
        }}
      >
        {narrative}
      </p>

      {/* Weighted criteria */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 11,
          padding: "16px 0",
          borderTop: "1px solid rgba(167,139,250,0.2)",
        }}
      >
        <span style={{ ...BLOCK_LABEL, marginBottom: 2 }}>Weighted criteria</span>
        {criteria.map((c) => (
          <div
            key={c.label}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-mid)" }}>
              {c.label}
            </span>
            <div
              style={{
                width: 120,
                height: 5,
                borderRadius: 3,
                background: "rgba(167,139,250,0.16)",
                overflow: "hidden",
              }}
            >
              <div
                className="hr-meter-fill"
                style={{
                  height: "100%",
                  width: `${parseFloat(c.val) * 100}%`,
                  background: "var(--violet)",
                  borderRadius: 3,
                }}
              />
            </div>
            <span
              style={{
                width: 30,
                font: "var(--mono-sm)",
                color: "var(--violet)",
                textAlign: "right",
              }}
            >
              {c.val}
            </span>
          </div>
        ))}
      </div>

      {/* Test match */}
      <div
        style={{
          padding: 16,
          marginTop: 6,
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-control)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span style={BLOCK_LABEL}>Test match · Meridian Labs</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Score gauge — violet ring at ~91% */}
          <div
            style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}
          >
            <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }} aria-hidden>
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="rgba(167,139,250,0.16)"
                strokeWidth="6"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="var(--violet)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="175.9"
                strokeDashoffset="15.8"
                style={{ filter: "drop-shadow(0 0 5px rgba(167,139,250,0.45))" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "var(--mono-lg)",
                color: "var(--text-hi)",
              }}
            >
              91
            </div>
          </div>
          {/* Reasons */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <ReasonRow sign="+" tone="var(--phosphor)">
              TypeScript + Next.js — your core stack
            </ReasonRow>
            <ReasonRow sign="+" tone="var(--phosphor)">
              Salary $160–195k within target
            </ReasonRow>
            <ReasonRow sign="−" tone="var(--amber)">
              Wants Rust experience — you have none
            </ReasonRow>
          </div>
        </div>
      </div>

      {/* Version footer + save */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 18,
        }}
      >
        <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
          PROFILE V{version} · USED BY RUN {runLabel}
        </span>
        <Button
          variant="primary"
          iconLeft="play"
          onClick={onSave}
          loading={saving}
        >
          Save &amp; re-run
        </Button>
      </div>

      {/* Ping sweep overlay — the "preview just recalculated" cue */}
      {shimmer && (
        <div
          aria-hidden
          data-sweep
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: "var(--radius-card)",
            background:
              "linear-gradient(100deg, transparent 30%, rgba(167,139,250,0.18) 50%, transparent 70%)",
            backgroundSize: "250% 100%",
            animation: "hr-sweep400 0.4s linear",
          }}
        />
      )}
    </div>
  );
}

function ReasonRow({
  sign,
  tone,
  children,
}: {
  sign: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ color: tone, font: "700 12px/1.4 var(--font-mono)" }}>
        {sign}
      </span>
      <span style={{ font: "var(--text-xs)", color: "var(--text-mid)" }}>
        {children}
      </span>
    </div>
  );
}
