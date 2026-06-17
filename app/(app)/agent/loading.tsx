import { AgentRunKeyframes } from "@/components/agent-run/agent-run-keyframes";

/**
 * Loading skeleton for the Agent Run segment (Agent Run.dc.html state 10).
 * Renders the two-column frame with shimmer timeline rows on the left and the
 * three status-card silhouettes on the right, so the route never flashes blank
 * chrome while the run snapshot resolves.
 */
const ROWS = [0, 1, 2, 3, 4, 5];
const CARD_HEIGHTS = [232, 196, 140];

const railWrap = {
  position: "relative" as const,
  width: 22,
  flexShrink: 0,
};

function SkeletonRow() {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <div style={railWrap}>
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 0,
            bottom: 0,
            width: 2,
            background: "rgba(167,139,250,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 4,
            top: 15,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "rgba(167,139,250,0.3)",
            border: "2px solid var(--bg-void)",
          }}
        />
      </div>
      <div
        style={{
          flex: 1,
          marginBottom: 12,
          padding: "14px 16px",
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          display: "flex",
          flexDirection: "column",
          gap: 9,
        }}
      >
        <div className="hr-shimmerbar" style={{ width: "40%", height: 13, borderRadius: 3 }} />
        <div className="hr-shimmerbar" style={{ width: "70%", height: 10, borderRadius: 3 }} />
      </div>
    </div>
  );
}

export default function AgentLoading() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", gap: 22, padding: "22px 24px" }}>
      <AgentRunKeyframes />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 17,
              color: "var(--text-hi)",
            }}
          >
            Trace
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", paddingRight: 6 }}>
          {ROWS.map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>

      <div
        style={{
          width: 372,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {CARD_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="hr-skeleton"
            style={{ height: h, borderRadius: "var(--radius-card)" }}
          />
        ))}
      </div>
    </div>
  );
}
