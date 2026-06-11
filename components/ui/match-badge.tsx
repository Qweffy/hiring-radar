import type { CSSProperties, HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type MatchLevel = "HIGH" | "MED" | "LOW";

export interface MatchBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** @default 'MED' */
  level?: MatchLevel;
  /** Optional numeric score appended in mono. */
  score?: number;
}

interface LevelStyle {
  color: string;
  bg: string;
  border: string;
}

// Opacity encodes strength: HIGH 100% / MED 60% / LOW 35%.
// Fills/borders derive from the violet accent at level-scaled alpha.
const LEVELS: Record<MatchLevel, LevelStyle> = {
  HIGH: {
    color: "var(--match-high)",
    bg: "color-mix(in srgb, var(--violet) 14%, transparent)",
    border: "color-mix(in srgb, var(--violet) 50%, transparent)",
  },
  MED: {
    color: "var(--match-med)",
    bg: "color-mix(in srgb, var(--violet) 8.4%, transparent)",
    border: "color-mix(in srgb, var(--violet) 30%, transparent)",
  },
  LOW: {
    color: "var(--match-low)",
    bg: "color-mix(in srgb, var(--violet) 4.9%, transparent)",
    border: "color-mix(in srgb, var(--violet) 17.5%, transparent)",
  },
};

/**
 * AI match-strength pill (violet). Use only where ScoreGauge doesn't fit.
 */
export function MatchBadge({ level = "MED", score, className, style, ...rest }: MatchBadgeProps) {
  const l = LEVELS[level];

  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 20,
    padding: "0 7px",
    font: "600 10px/1 var(--font-mono)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: l.color,
    background: l.bg,
    border: `1px solid ${l.border}`,
    borderRadius: "var(--radius-sm)",
    whiteSpace: "nowrap",
    ...style,
  };

  return (
    <span className={cn(className)} style={badgeStyle} {...rest}>
      <span
        aria-hidden="true"
        style={{ width: 5, height: 5, borderRadius: "50%", background: l.color, flexShrink: 0 }}
      />
      {level}
      {score != null && <span style={{ opacity: 0.85 }}>{score}</span>}
    </span>
  );
}
