"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { TraceStep as TraceStepModel } from "@/components/agent-run/trace-types";

/**
 * One row in the agent trace timeline: a violet-threaded rail with a coloured
 * dot, and a card whose tint/anatomy varies by step type (tool, reasoning,
 * decision, error). Mirrors TraceStep.dc.html exactly — colours from tokens,
 * radii ≤ card, all data in mono. Tool cards fold their observation chip in and
 * can expand the raw JSON args; decision cards link to the posting.
 */

type Tint = { bg: string; border: string; accent: string };

const TINTS: Record<string, Tint> = {
  tool: { bg: "var(--bg-raised)", border: "var(--border)", accent: "transparent" },
  reasoning: {
    bg: "var(--violet-12)",
    border: "rgba(167,139,250,0.28)",
    accent: "var(--violet)",
  },
  error: {
    bg: "var(--red-14)",
    border: "rgba(255,93,93,0.32)",
    accent: "var(--red)",
  },
  decisionYes: {
    bg: "var(--phosphor-08)",
    border: "var(--border-strong)",
    accent: "var(--phosphor)",
  },
  decisionNo: {
    bg: "var(--bg-raised)",
    border: "var(--border)",
    accent: "var(--text-low)",
  },
};

function dotColor(step: TraceStepModel): string {
  switch (step.type) {
    case "tool":
      return "var(--cyan)";
    case "reasoning":
      return "var(--violet)";
    case "error":
      return "var(--red)";
    case "decision":
      return step.decision === "no" ? "var(--text-low)" : "var(--phosphor)";
  }
}

function tintFor(step: TraceStepModel): Tint {
  if (step.type === "decision") {
    return step.decision === "no" ? TINTS.decisionNo! : TINTS.decisionYes!;
  }
  return TINTS[step.type] ?? TINTS.tool!;
}

const railStyle: CSSProperties = {
  position: "relative",
  width: 22,
  flexShrink: 0,
};

const connectorStyle: CSSProperties = {
  position: "absolute",
  left: 10,
  top: 0,
  bottom: -14,
  width: 2,
  background: "rgba(167,139,250,0.26)",
};

export interface TraceStepProps {
  step: TraceStepModel;
}

export function TraceStep({ step }: TraceStepProps) {
  const [expanded, setExpanded] = useState(false);
  const tint = tintFor(step);
  const dimmed = step.type === "decision" && step.decision === "no";

  const cardStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    marginBottom: 14,
    padding: "13px 16px",
    background: tint.bg,
    border: `1px solid ${tint.border}`,
    borderLeft:
      tint.accent === "transparent"
        ? `1px solid ${tint.border}`
        : `3px solid ${tint.accent}`,
    borderRadius: "var(--radius-card)",
    boxShadow: "var(--shadow-card)",
    opacity: dimmed ? 0.62 : 1,
  };

  const dotStyle: CSSProperties = {
    position: "absolute",
    left: 4,
    top: 15,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: dotColor(step),
    border: "2px solid var(--bg-void)",
    boxShadow: `0 0 8px ${dotColor(step)}`,
    zIndex: 1,
  };

  return (
    <div style={{ display: "flex", gap: 14, fontFamily: "var(--font-ui)" }}>
      <div style={railStyle}>
        <div style={connectorStyle} />
        <div style={dotStyle} />
      </div>
      <div style={cardStyle} className={step.live ? "hr-livecard" : undefined}>
        {step.type === "tool" && (
          <ToolBody step={step} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
        )}
        {step.type === "reasoning" && <ReasoningBody step={step} />}
        {step.type === "decision" && <DecisionBody step={step} />}
        {step.type === "error" && <ErrorBody step={step} />}
      </div>
    </div>
  );
}

function ToolBody({
  step,
  expanded,
  onToggle,
}: {
  step: TraceStepModel;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--cyan)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
          aria-hidden="true"
        >
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
        </svg>
        <span style={{ font: "var(--mono-base)", color: "var(--text-hi)" }}>{step.name}</span>
        <span
          style={{
            font: "600 9px/1 var(--font-mono)",
            letterSpacing: "0.12em",
            color: "var(--text-low)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "3px 5px",
          }}
        >
          TOOL
        </span>
      </div>

      {step.argsLine && (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 9,
              width: "100%",
              padding: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-low)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: expanded ? "rotate(90deg)" : "none",
                transition: "transform var(--dur-fast)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span
              style={{
                font: "var(--mono-sm)",
                color: "var(--text-low-content)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {step.argsLine}
            </span>
          </button>
          {expanded && step.argsJson && (
            <pre
              style={{
                margin: "8px 0 0",
                padding: "11px 13px",
                background: "var(--bg-void)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-control)",
                font: "var(--mono-sm)",
                color: "var(--cyan)",
                whiteSpace: "pre",
                overflow: "auto",
              }}
            >
              {step.argsJson}
            </pre>
          )}
        </>
      )}

      <div
        style={{
          marginTop: 11,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 9px",
          background: "var(--phosphor-08)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <span style={{ font: "var(--mono-sm)", color: "var(--phosphor)" }}>{step.obs}</span>
      </div>
    </>
  );
}

function ReasoningBody({ step }: { step: TraceStepModel }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--violet)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 1 }}
          aria-hidden="true"
        >
          <path d="M12 8V4H8" />
          <rect width={16} height={12} x={4} y={8} rx={2} />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
        <p style={{ margin: 0, font: "italic 14px/1.55 var(--font-ui)", color: "var(--text-mid)" }}>
          {step.text}
        </p>
      </div>
      {step.live && (
        <div
          className="hr-think"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginTop: 10,
            font: "600 10px/1 var(--font-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--violet)",
          }}
        >
          <span
            style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--violet)" }}
          />
          Thinking…
        </div>
      )}
    </>
  );
}

function DecisionBody({ step }: { step: TraceStepModel }) {
  const no = step.decision === "no";
  const decIconStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: "var(--radius-sm)",
    font: "700 13px/1 var(--font-mono)",
    color: no ? "var(--text-low)" : "var(--phosphor)",
    background: no ? "transparent" : "var(--phosphor-12)",
    border: `1px solid ${no ? "var(--border)" : "var(--border-strong)"}`,
  };
  const chipScoreStyle: CSSProperties = {
    font: "600 11px/1 var(--font-mono)",
    color: no ? "var(--text-low-content)" : "var(--violet)",
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span style={decIconStyle} aria-hidden="true">
        {no ? "✗" : "✓"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, font: "500 14px/1.45 var(--font-ui)", color: "var(--text-hi)" }}>
          {step.text}
        </p>
        {step.chipCompany && (
          <Link
            href={step.chipHnId ? `/browse?selected=${step.chipHnId}` : "/browse"}
            className="hr-decision-chip"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              marginTop: 9,
              padding: "6px 10px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-control)",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            <span style={{ font: "600 12px/1.2 var(--font-ui)", color: "var(--text-hi)" }}>
              {step.chipCompany}
            </span>
            <span style={chipScoreStyle}>{step.chipScore}</span>
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--cyan)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}

function ErrorBody({ step }: { step: TraceStepModel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--red)"
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
      <span style={{ font: "var(--mono-sm)", color: "var(--red)" }}>{step.text}</span>
    </div>
  );
}
