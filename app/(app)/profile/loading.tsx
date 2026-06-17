import  { type CSSProperties } from "react";

import { Skeleton } from "@/components/ui/skeleton";


/**
 * Loading / returning user (state 07). Skeletons in the SHAPE of the loaded
 * form — never the onboarding empty state. Two distinct shimmer tints: phosphor
 * on the form column, violet on the AI/preview column.
 */
export default function ProfileLoading() {
  return (
    <div className="absolute inset-0 overflow-auto">
      <style href="hr-profile-loading" precedence="medium">
        {`@keyframes hr-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){[data-shimmer]{animation:none!important}}`}
      </style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)",
          gap: 24,
          padding: 28,
          alignItems: "start",
        }}
      >
        {/* LEFT — form skeleton (phosphor shimmer) */}
        <div
          style={{
            padding: 22,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ width: 120, height: 12 }}>
            <Skeleton variant="text" lines={1} />
          </div>
          <div data-shimmer style={{ ...PHOSPHOR_SHIMMER, height: 110 }} />
          <Skeleton variant="text" lines={3} />
        </div>

        {/* RIGHT — preview skeleton (violet shimmer) */}
        <div
          style={{
            padding: 20,
            background: "var(--violet-12)",
            border: "1px solid rgba(167,139,250,0.32)",
            borderRadius: "var(--radius-card)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Skeleton variant="text" lines={3} />
          <div data-shimmer style={{ ...VIOLET_SHIMMER, height: 120 }} />
        </div>
      </div>
    </div>
  );
}

const PHOSPHOR_SHIMMER: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(147,164,179,0.06), rgba(61,255,162,0.10), rgba(147,164,179,0.06))",
  backgroundSize: "200% 100%",
  borderRadius: "var(--radius-control)",
  animation: "hr-shimmer 1.4s linear infinite",
};

const VIOLET_SHIMMER: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(167,139,250,0.08), rgba(167,139,250,0.2), rgba(167,139,250,0.08))",
  backgroundSize: "200% 100%",
  borderRadius: "var(--radius-control)",
  animation: "hr-shimmer 1.4s linear infinite",
};
