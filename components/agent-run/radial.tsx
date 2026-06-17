import type { CSSProperties, ReactNode } from "react";

/**
 * Generic progress radial used across the Agent Run status panel — the
 * step-budget ring (phosphor) and the per-pick score ring (violet). One SVG,
 * rotate(-90) so the arc starts at 12 o'clock, stroke-dashoffset =
 * circumference × (1 − value). Center content (number/label) overlays via an
 * absolutely-positioned slot.
 */
export interface RadialProps {
  size: number;
  radius: number;
  strokeWidth: number;
  /** 0–1 fraction filled. */
  value: number;
  trackColor: string;
  progressColor: string;
  /** Drop-shadow glow on the progress arc, e.g. for the budget ring. */
  glow?: string;
  children?: ReactNode;
}

export function Radial({
  size,
  radius,
  strokeWidth,
  value,
  trackColor,
  progressColor,
  glow,
  children,
}: RadialProps) {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  const center = size / 2;

  const arcStyle: CSSProperties | undefined = glow
    ? { filter: `drop-shadow(0 0 5px ${glow})` }
    : undefined;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={arcStyle}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
