import  { type CSSProperties, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";



export type StatusValue =
  | "NEW"
  | "REMOTE"
  | "ONSITE"
  | "HYBRID"
  | "VISA"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL"
  | "RESUMED"
  | "CANCELLED"
  | "CRON"
  | "MANUAL"
  | "BACKFILL";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  // `string & {}` keeps autocomplete for the known StatusValues while still
  // accepting arbitrary strings, without `string` swallowing the literal union.
  status: StatusValue | (string & {});
  /** Override the displayed text (defaults to the uppercased status). */
  label?: string;
}

interface StatusStyle {
  color: string;
  fill: string;
  border: string;
  dot?: boolean;
  pulse?: boolean;
}

const FALLBACK: StatusStyle = {
  color: "var(--text-mid)",
  fill: "transparent",
  border: "var(--border)",
};

const STATUS_STYLES: Record<StatusValue, StatusStyle> = {
  // posting attributes
  NEW: {
    color: "var(--phosphor)",
    fill: "var(--phosphor-12)",
    border: "var(--border-strong)",
    dot: true,
  },
  REMOTE: {
    color: "var(--cyan)",
    fill: "var(--cyan-12)",
    border: "color-mix(in srgb, var(--cyan) 35%, transparent)",
  },
  ONSITE: FALLBACK,
  HYBRID: FALLBACK,
  VISA: {
    color: "var(--violet)",
    fill: "var(--violet-12)",
    border: "color-mix(in srgb, var(--violet) 40%, transparent)",
  },
  // process states
  RUNNING: {
    color: "var(--phosphor)",
    fill: "var(--phosphor-12)",
    border: "var(--border-strong)",
    pulse: true,
  },
  COMPLETED: {
    color: "var(--phosphor)",
    fill: "var(--phosphor-08)",
    border: "var(--border)",
  },
  FAILED: {
    color: "var(--red)",
    fill: "var(--red-14)",
    border: "color-mix(in srgb, var(--red) 42%, transparent)",
  },
  PARTIAL: {
    color: "var(--amber)",
    fill: "var(--amber-14)",
    border: "color-mix(in srgb, var(--amber) 38%, transparent)",
  },
  RESUMED: {
    color: "var(--cyan)",
    fill: "var(--cyan-12)",
    border: "color-mix(in srgb, var(--cyan) 35%, transparent)",
  },
  CANCELLED: {
    color: "var(--text-low-content)",
    fill: "transparent",
    border: "var(--border)",
  },
  // triggers
  CRON: FALLBACK,
  MANUAL: FALLBACK,
  BACKFILL: FALLBACK,
};

const isStatusValue = (key: string): key is StatusValue =>
  Object.prototype.hasOwnProperty.call(STATUS_STYLES, key);

const PULSE_CSS = `
@keyframes hr-badge-ping {
  0% { transform: scale(1); opacity: 0.7; }
  80%, 100% { transform: scale(2.6); opacity: 0; }
}
.hr-badge-pulse { animation: hr-badge-ping 1.8s var(--ease-out) infinite; }
@media (prefers-reduced-motion: reduce) {
  .hr-badge-pulse { animation: none; }
}
`;

/**
 * Mono uppercase status pill. Color, dot, and pulse derive from `status`.
 * Covers posting attributes (NEW/REMOTE/VISA), run states (RUNNING/FAILED...)
 * and triggers (CRON/MANUAL/BACKFILL).
 */
export function StatusBadge({ status, label, className, style, ...rest }: StatusBadgeProps) {
  const key = status.toUpperCase();
  const s = isStatusValue(key) ? STATUS_STYLES[key] : FALLBACK;

  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 20,
    padding: "0 7px",
    font: "600 10px/1 var(--font-mono)",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    color: s.color,
    background: s.fill,
    border: `1px solid ${s.border}`,
    borderRadius: "var(--radius-sm)",
    whiteSpace: "nowrap",
    ...style,
  };

  return (
    <span className={cn(className)} style={badgeStyle} {...rest}>
      {/* reason: genuine boolean OR — `??` would wrongly return `false` for
          `dot` and skip `pulse`. dot/pulse are boolean flags, not nullable data. */}
      {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
      {(s.dot || s.pulse) && (
        <span style={{ position: "relative", width: 6, height: 6, flexShrink: 0 }} aria-hidden="true">
          <span
            style={{ position: "absolute", inset: 0, borderRadius: "50%", background: s.color }}
          />
          {s.pulse && (
            <span
              className="hr-badge-pulse"
              style={{ position: "absolute", inset: 0, borderRadius: "50%", background: s.color }}
            />
          )}
        </span>
      )}
      {label ?? key}
      {s.pulse && (
        <style href="hr-status-badge-pulse" precedence="default">
          {PULSE_CSS}
        </style>
      )}
    </span>
  );
}
