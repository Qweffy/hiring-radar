"use client";

import type { CSSProperties, HTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import { useCountUp } from "@/components/ui/use-count-up";

export interface ScoreGaugeProps extends HTMLAttributes<HTMLDivElement> {
  /** 0-100. */
  score?: number;
  /** Diameter in px. @default 64 */
  size?: number;
  /** Optional mono label beneath. */
  label?: string;
}

const ARC_CSS = `
.hr-gauge-arc { transition: stroke-dashoffset 80ms linear; }
@media (prefers-reduced-motion: reduce) {
  .hr-gauge-arc { transition: none; }
}
`;

/** Radial 0-100 match-score gauge in violet with a mono number; counts up on mount. */
export function ScoreGauge({ score = 0, size = 64, label, className, style, ...rest }: ScoreGaugeProps) {
  const shown = useCountUp(score);

  const stroke = Math.max(4, size * 0.09);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, shown)) / 100;
  const numFont = size >= 56 ? "var(--mono-lg)" : "600 13px/1 var(--font-mono)";

  const rootStyle: CSSProperties = {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    ...style,
  };

  return (
    <div className={cn(className)} style={rootStyle} {...rest}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--violet-16)"
            strokeWidth={stroke}
          />
          <circle
            className="hr-gauge-arc"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--violet)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{
              filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--violet) 45%, transparent))",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: numFont,
            color: "var(--text-hi)",
          }}
        >
          {shown}
        </div>
      </div>
      {label && (
        <span
          style={{
            font: "var(--label-mono)",
            letterSpacing: "var(--label-tracking)",
            textTransform: "uppercase",
            color: "var(--text-label)",
          }}
        >
          {label}
        </span>
      )}
      <style href="hr-score-gauge-arc" precedence="default">
        {ARC_CSS}
      </style>
    </div>
  );
}
