import  { type CSSProperties } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state (gallery state 01). Skeletons in the SHAPE of the settings
 * panels — a phosphor shimmer on the control rows, never a blank screen. The
 * card stack mirrors the loaded layout so there's no jump on hydration.
 */
export default function SettingsLoading() {
  return (
    <div className="absolute inset-0 overflow-auto">
      <style href="hr-settings-loading" precedence="medium">
        {`@keyframes hr-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){[data-shimmer]{animation:none!important}}`}
      </style>
      <div style={WRAP}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={CARD}>
            <div style={{ width: 120 }}>
              <Skeleton variant="text" lines={1} />
            </div>
            <div data-shimmer style={{ ...SHIMMER, height: 36 }} />
            <Skeleton variant="text" lines={2} />
            <div data-shimmer style={{ ...SHIMMER, height: 36 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const WRAP: CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  padding: "32px 24px 56px",
  display: "flex",
  flexDirection: "column",
  gap: 22,
};

const CARD: CSSProperties = {
  padding: 22,
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const SHIMMER: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(147,164,179,0.06), rgba(61,255,162,0.10), rgba(147,164,179,0.06))",
  backgroundSize: "200% 100%",
  borderRadius: "var(--radius-control)",
  animation: "hr-shimmer 1.4s linear infinite",
};
