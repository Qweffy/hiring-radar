"use client";

import { Fragment } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, Check } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner } from "@/components/ui/spinner";
import type { SweepView } from "@/components/pipeline/types";

export type StepPhase = "done" | "active" | "pending";

export interface RunningStep {
  name: string;
  phase: StepPhase;
}

const triggerChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 20,
  padding: "0 7px",
  font: "600 10px/1 var(--font-mono)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-mid)",
  border: "1px solid var(--border)",
  whiteSpace: "nowrap",
};

const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: "var(--radius-control)",
  font: "var(--mono-sm)",
};

function StepChip({ step }: { step: RunningStep }) {
  if (step.phase === "done") {
    return (
      <span
        style={{
          ...chipBase,
          background: "var(--phosphor-08)",
          border: "1px solid var(--border-strong)",
          color: "var(--phosphor)",
        }}
      >
        <Check size={12} strokeWidth={2.5} aria-hidden="true" />
        {step.name}
      </span>
    );
  }
  if (step.phase === "active") {
    return (
      <span
        style={{
          ...chipBase,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-strong)",
          color: "var(--text-hi)",
        }}
      >
        <Spinner size={12} color="var(--phosphor)" />
        {step.name}…
      </span>
    );
  }
  return (
    <span
      style={{
        ...chipBase,
        border: "1px dashed var(--border)",
        color: "var(--text-low)",
      }}
    >
      {step.name}
    </span>
  );
}

export interface RunningSweepProps {
  sweep: SweepView;
  /** Live elapsed readout, e.g. "2m 04s". */
  elapsed: string;
  steps: RunningStep[];
}

/** State 2 — the latest sweep is RUNNING: header + indeterminate beam + steps. */
export function RunningSweep({ sweep, elapsed, steps }: RunningSweepProps) {
  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}
    >
      <style href="hr-running-beam" precedence="medium">
        {`@keyframes hr-shimmer{0%{transform:translateX(-120%)}100%{transform:translateX(360%)}}
@media (prefers-reduced-motion:reduce){.hr-run-beam{animation:none}}`}
      </style>

      <div
        className="relative items-center"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 90px 110px",
          gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid var(--divider)",
        }}
      >
        <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
          <span style={{ font: "600 13px/1.2 var(--font-ui)", color: "var(--text-hi)" }}>
            {sweep.monthLabel}
          </span>
          <span style={triggerChip}>{sweep.trigger}</span>
        </div>
        <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
          {elapsed}
        </span>
        <span className="flex justify-end">
          <StatusBadge status="RUNNING" />
        </span>

        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            overflow: "hidden",
            background: "var(--phosphor-08)",
          }}
        >
          <span
            className="hr-run-beam"
            style={{
              position: "absolute",
              inset: 0,
              width: "42%",
              background:
                "linear-gradient(90deg, transparent, var(--phosphor), transparent)",
              animation: "hr-shimmer 1.2s linear infinite",
            }}
          />
        </span>
      </div>

      <div className="flex items-center" style={{ padding: "16px 18px", gap: 6 }}>
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          const afterActive = steps[index]?.phase === "active";
          return (
            <Fragment key={step.name}>
              <StepChip step={step} />
              {!last && (
                <ArrowRight
                  size={14}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  style={{
                    color: "var(--text-low)",
                    flexShrink: 0,
                    opacity: afterActive ? 0.4 : 1,
                  }}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
