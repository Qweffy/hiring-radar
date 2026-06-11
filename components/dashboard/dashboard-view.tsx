import { formatMonth } from "@/lib/format";
import type { DashboardData } from "@/lib/queries/dashboard";
import { RadarScope } from "@/components/dashboard/radar-scope";
import { Scorecards } from "@/components/dashboard/scorecards";
import { AgentDigest } from "@/components/dashboard/agent-digest";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";

export interface DashboardViewProps {
  data: DashboardData;
}

/**
 * Radar Dashboard content (rendered inside the shell's .hr-void slot). ROW 1 is
 * a 2-col grid (hero radar | right column of scorecards + agent digest); ROW 2
 * is the full-width signal feed. Each widget owns its own degradation — the
 * route error boundary catches a crash without blanking the chrome.
 */
export function DashboardView({ data }: DashboardViewProps) {
  if (!data.hasPostings) {
    return <DashboardEmpty />;
  }

  const monthLabel = data.month !== null ? formatMonth(data.month) : "—";

  return (
    <div className="absolute inset-0 overflow-auto" style={{ padding: 24 }}>
      <div style={{ maxWidth: "var(--maxw-content)", margin: "0 auto" }}>
        {/* ROW 1 */}
        <div
          className="grid items-stretch"
          style={{
            gridTemplateColumns: "minmax(0, 1.42fr) minmax(0, 1fr)",
            gap: 24,
            marginBottom: 24,
          }}
        >
          {/* Hero radar panel */}
          <div
            className="relative flex flex-col overflow-hidden"
            style={{
              padding: 20,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <RadarScope
              blips={data.blips}
              monthLabel={monthLabel}
              totalPostings={data.sweepCaption.totalPostings}
              newCount={data.sweepCaption.newCount}
            />
          </div>

          {/* Right column */}
          <div className="flex flex-col" style={{ gap: 24 }}>
            <Scorecards data={data.scorecards} />
            <AgentDigest />
          </div>
        </div>

        {/* ROW 2 */}
        <SignalFeed rows={data.signalFeed} />
      </div>
    </div>
  );
}
