import  { type CSSProperties } from "react";

const SHIMMER: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(147,164,179,.06), rgba(61,255,162,.10), rgba(147,164,179,.06))",
  backgroundSize: "200% 100%",
  borderRadius: 3,
  animation: "hr-shimmer 1.4s linear infinite",
};

const ROW_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1.4fr) 80px 70px 60px 110px",
  gap: 12,
  alignItems: "center",
  padding: "16px 18px",
  borderBottom: "1px solid var(--divider)",
};

/** Skeleton sweeps table while the first pipeline query resolves (State 6). */
export default function PipelineLoading() {
  return (
    <div className="absolute inset-0 overflow-auto">
      <style href="hr-pipeline-skeleton" precedence="medium">
        {`@keyframes hr-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.hr-skel-bar{animation:none!important}}`}
      </style>
      <div className="flex flex-col" style={{ padding: "24px 28px", gap: 22 }}>
        <header className="flex items-baseline" style={{ gap: 14, marginBottom: 18 }}>
          <span
            style={{
              font: "var(--label-mono)",
              letterSpacing: "var(--label-tracking)",
              textTransform: "uppercase",
              color: "var(--text-low)",
            }}
          >
            Admin · pipeline
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: "-0.02em",
              color: "var(--text-hi)",
            }}
          >
            Ingest pipeline
          </h1>
        </header>

        <div
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card)",
            overflow: "hidden",
            minHeight: 300,
            padding: "6px 0",
          }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={ROW_GRID}>
              <div className="hr-skel-bar" style={{ ...SHIMMER, height: 13, width: "70%" }} />
              <div className="hr-skel-bar" style={{ ...SHIMMER, height: 11 }} />
              <div className="hr-skel-bar" style={{ ...SHIMMER, height: 11 }} />
              <div className="hr-skel-bar" style={{ ...SHIMMER, height: 11 }} />
              <div
                className="hr-skel-bar"
                style={{ ...SHIMMER, height: 20, width: 90, borderRadius: "var(--radius-sm)" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
