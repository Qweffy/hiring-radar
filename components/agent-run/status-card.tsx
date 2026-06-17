import  { type CSSProperties } from "react";

import { Radial } from "@/components/agent-run/radial";
import { usd } from "@/components/agent-run/run-format";
import { StatusBadge, type StatusValue } from "@/components/ui/status-badge";

/**
 * Card 1 of the status panel — run identity, started/elapsed clocks, the
 * step-budget radial + cost bar, and the model row. Pure presentational: the
 * live `elapsed` string is owned by the parent (it ticks each second).
 */
export interface StatusCardProps {
  runId: number;
  badge: StatusValue;
  startedAt: string;
  elapsed: string;
  stepsUsed: number;
  stepBudget: number;
  costUsd: number;
  costBudget: number;
  model: string;
}

const cardStyle: CSSProperties = {
  padding: 18,
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
};

const labelStyle: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

export function StatusCard({
  runId,
  badge,
  startedAt,
  elapsed,
  stepsUsed,
  stepBudget,
  costUsd,
  costBudget,
  model,
}: StatusCardProps) {
  const budgetValue = stepBudget > 0 ? stepsUsed / stepBudget : 0;
  const costPct =
    costBudget > 0 ? Math.min(100, Math.round((costUsd / costBudget) * 100)) : 0;

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <span style={{ font: "var(--mono-lg)", color: "var(--text-hi)" }}>#{runId}</span>
        <StatusBadge status={badge} aria-live="polite" />
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={labelStyle}>Started</span>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>{startedAt}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={labelStyle}>Elapsed</span>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>{elapsed}</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "14px 0",
          borderTop: "1px solid var(--divider)",
        }}
      >
        <Radial
          size={64}
          radius={27}
          strokeWidth={6}
          value={budgetValue}
          trackColor="rgba(61,255,162,0.14)"
          progressColor="var(--phosphor)"
          glow="rgba(61,255,162,0.4)"
        >
          <span style={{ font: "600 15px/1 var(--font-mono)", color: "var(--text-hi)" }}>
            {stepsUsed}
          </span>
          <span style={{ font: "600 9px/1 var(--font-mono)", color: "var(--text-low)" }}>
            /{stepBudget}
          </span>
        </Radial>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={labelStyle}>Step budget</span>
          <div style={{ font: "var(--mono-sm)", color: "var(--text-mid)", marginTop: 4 }}>
            {stepsUsed} of {stepBudget} steps
          </div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={labelStyle}>Cost</span>
            <span style={{ font: "var(--mono-sm)", color: "var(--text-hi)" }}>
              {usd(costUsd)} <span style={{ color: "var(--text-low-content)" }}>/ {usd(costBudget)}</span>
            </span>
          </div>
          <div
            style={{
              marginTop: 7,
              height: 4,
              borderRadius: 2,
              background: "rgba(147,164,179,0.16)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${costPct}%`,
                background: "var(--phosphor)",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 12,
          borderTop: "1px solid var(--divider)",
        }}
      >
        <span style={labelStyle}>Model</span>
        <span style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>{model}</span>
      </div>
    </div>
  );
}
