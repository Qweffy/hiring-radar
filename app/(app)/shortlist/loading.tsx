import  { type CSSProperties } from "react";

const SHIMMER: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(147,164,179,0.06), rgba(61,255,162,0.10), rgba(147,164,179,0.06))",
  backgroundSize: "200% 100%",
  borderRadius: 3,
  animation: "hr-sl-shimmer 1.4s linear infinite",
};

const BAR_WIDTHS: readonly { w: number; h: number }[] = [
  { w: 90, h: 16 },
  { w: 220, h: 12 },
  { w: 120, h: 12 },
];

/** Skeleton entry rows while the first shortlist query resolves (State 01). */
export default function ShortlistLoading() {
  return (
    <div className="absolute inset-0 overflow-auto">
      <style href="hr-shortlist-skeleton" precedence="medium">
        {`@keyframes hr-sl-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .hr-sl-skel { animation: none !important; } }`}
      </style>
      <div style={{ padding: "26px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: "-0.02em",
              color: "var(--text-hi)",
            }}
          >
            Shortlist
          </h2>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
            … TRACKED
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 18,
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {BAR_WIDTHS.map((bar, j) => (
                  <div
                    key={j}
                    className="hr-sl-skel"
                    style={{ ...SHIMMER, width: bar.w, height: bar.h }}
                  />
                ))}
              </div>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  border: "5px solid rgba(167,139,250,0.18)",
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
