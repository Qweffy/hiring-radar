import type * as React from "react";

export interface SpinnerProps {
  /** Diameter in px. @default 16 */
  size?: number;
  /** Stroke color. @default 'currentColor' */
  color?: string;
  style?: React.CSSProperties;
}

/** Inline phosphor spinner; static ring under prefers-reduced-motion. */
export function Spinner({ size = 16, color = "currentColor", style }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="block animate-spin [animation-duration:0.7s] motion-reduce:animate-none"
      style={style}
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity="0.22" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
