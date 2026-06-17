import { Scorecard } from "@/components/ui/scorecard";
import { Sparkline } from "@/components/ui/sparkline";
import {
  STRONG_MATCH_FLOOR,
  type DashboardScorecards,
} from "@/lib/queries/dashboard";

export interface ScorecardsProps {
  data: DashboardScorecards;
}

/**
 * 2×2 instrument tiles. Three are DS `Scorecard`s; the fourth (Median salary)
 * is a bespoke card pairing a mono number with an inline sparkline + delta.
 *
 * Card 2 is the agent's real "Match ≥ 80" count — postings scored at or above
 * STRONG_MATCH_FLOOR — over the postings it has assessed this month.
 */
export function Scorecards({ data }: ScorecardsProps) {
  const medianLabel =
    data.medianSalary !== null ? `$${Math.round(data.medianSalary / 1000)}k` : "—";

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <Scorecard
        label="New this month"
        value={data.newCount}
        delta={data.newDelta ?? undefined}
      />
      <Scorecard
        label={`Match ≥ ${STRONG_MATCH_FLOOR}`}
        value={data.strongMatchCount}
        suffix={data.assessedCount > 0 ? `/ ${data.assessedCount}` : undefined}
        tone="violet"
      />
      <Scorecard label="Remote share" value={data.remoteSharePct} suffix="%" tone="cyan" />

      {/* Bespoke median-salary card */}
      <div
        className="flex flex-col"
        style={{
          gap: 10,
          padding: 16,
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span
          className="uppercase"
          style={{
            font: "var(--label-mono)",
            letterSpacing: "var(--label-tracking)",
            color: "var(--text-low)",
          }}
        >
          Median salary
        </span>
        <div className="flex items-end justify-between" style={{ gap: 10 }}>
          <span
            style={{
              font: "var(--mono-xl)",
              color: "var(--text-hi)",
              letterSpacing: "-0.01em",
            }}
          >
            {medianLabel}
          </span>
          <Sparkline data={[150, 158, 155, 162, 159, 166, 165]} tone="cyan" />
        </div>
        {/* M5: real per-sweep delta once historical aggregates land. */}
        <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
          monthly median
        </span>
      </div>
    </div>
  );
}
