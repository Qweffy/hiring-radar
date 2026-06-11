import { Skeleton } from "@/components/ui/skeleton";

const MINI = 220;
const MINI_CENTER = MINI / 2;
const MINI_RINGS = [
  { r: 108, stroke: "var(--phosphor-dim)" },
  { r: 82, stroke: "var(--phosphor-dim)" },
  { r: 52, stroke: "var(--phosphor-dim)" },
  { r: 26, stroke: "rgba(61,255,162,0.22)" },
];

const MINI_SWEEP_CSS = `
@keyframes hr-rotate { to { transform: rotate(360deg); } }
.hr-mini-sweep { animation: hr-rotate 4s linear infinite; }
@media (prefers-reduced-motion: reduce) { .hr-mini-sweep { animation: none; } }
`;

const SWEEP_CONIC =
  "conic-gradient(from 0deg, rgba(61,255,162,0.20) 0deg, rgba(61,255,162,0.05) 22deg, transparent 46deg, transparent 360deg)";

/**
 * Dashboard loading state. The radar frame animates immediately (instrument is
 * alive); the data tiles shimmer until the query resolves. Each widget owns its
 * own boundary — one slow query never blanks the screen.
 */
export default function DashboardLoading() {
  return (
    <div className="absolute inset-0 overflow-auto" style={{ padding: 24 }}>
      <div style={{ maxWidth: "var(--maxw-content)", margin: "0 auto" }}>
        <div
          className="grid items-stretch"
          style={{
            gridTemplateColumns: "minmax(0, 1.42fr) minmax(0, 1fr)",
            gap: 24,
            marginBottom: 24,
          }}
        >
          {/* Hero panel with an animated mini radar */}
          <div
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              minHeight: 300,
              padding: 20,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="relative" style={{ width: MINI, height: MINI }}>
              <svg
                width={MINI}
                height={MINI}
                viewBox={`0 0 ${MINI} ${MINI}`}
                className="absolute left-0 top-0"
                aria-hidden="true"
              >
                {MINI_RINGS.map((ring) => (
                  <circle
                    key={ring.r}
                    cx={MINI_CENTER}
                    cy={MINI_CENTER}
                    r={ring.r}
                    fill="none"
                    stroke={ring.stroke}
                    strokeWidth={1}
                  />
                ))}
                <line
                  x1={MINI_CENTER}
                  y1={4}
                  x2={MINI_CENTER}
                  y2={MINI - 4}
                  stroke="rgba(61,255,162,0.06)"
                  strokeWidth={1}
                />
                <line
                  x1={4}
                  y1={MINI_CENTER}
                  x2={MINI - 4}
                  y2={MINI_CENTER}
                  stroke="rgba(61,255,162,0.06)"
                  strokeWidth={1}
                />
              </svg>
              <div
                className="hr-mini-sweep absolute"
                aria-hidden="true"
                style={{
                  left: 12,
                  top: 12,
                  width: 196,
                  height: 196,
                  borderRadius: "50%",
                  background: SWEEP_CONIC,
                }}
              />
              <div
                aria-hidden="true"
                className="absolute"
                style={{
                  left: MINI_CENTER,
                  top: MINI_CENTER,
                  width: 6,
                  height: 6,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  background: "var(--phosphor)",
                  boxShadow: "0 0 10px var(--phosphor)",
                }}
              />
            </div>
          </div>

          {/* Right column: 2×2 skeleton tiles + a tall agent-digest skeleton */}
          <div className="flex flex-col" style={{ gap: 24 }}>
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} variant="card" style={{ height: 112 }} />
              ))}
            </div>
            <Skeleton variant="card" style={{ flex: 1, minHeight: 180 }} />
          </div>
        </div>

        {/* Signal feed skeleton */}
        <div
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--divider)" }}>
            <div className="hr-skeleton" style={{ width: 96, height: 11 }} />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="flex items-center"
              style={{ gap: 16, padding: "12px 18px", borderBottom: "1px solid var(--divider)" }}
            >
              <div className="hr-skeleton shrink-0" style={{ width: 54, height: 11 }} />
              <div className="hr-skeleton shrink-0" style={{ width: 7, height: 7, borderRadius: "50%" }} />
              <div className="hr-skeleton" style={{ flex: 1, height: 11 }} />
            </div>
          ))}
        </div>
      </div>

      <style href="hr-dashboard-loading-sweep" precedence="medium">
        {MINI_SWEEP_CSS}
      </style>
    </div>
  );
}
