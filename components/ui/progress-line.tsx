import * as React from "react";

import { cn } from "@/lib/cn";

export interface ProgressLineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100. Ignored when indeterminate. */
  value?: number;
  /** @default 'phosphor' */
  tone?: "phosphor" | "violet";
  /** Animated indeterminate sweep. @default false */
  indeterminate?: boolean;
}

const SWEEP_CSS = `
@keyframes hr-progress-sweep { 0% { left: -35%; } 100% { left: 100%; } }
.hr-progress-sweep { animation: hr-progress-sweep 1.2s var(--ease-in-out) infinite; }
@media (prefers-reduced-motion: reduce) {
  .hr-progress-sweep { animation: none; left: 0; width: 100%; opacity: 0.6; }
}
`;

/**
 * ProgressLine — thin determinate/indeterminate progress bar.
 * Phosphor by default, violet for AI/agent work.
 */
export function ProgressLine({
  value = 0,
  tone = "phosphor",
  indeterminate = false,
  className,
  style,
  ...rest
}: ProgressLineProps) {
  const color = tone === "violet" ? "var(--ai)" : "var(--accent)";
  const glow = tone === "violet" ? "var(--glow-violet)" : "var(--glow-phosphor-sm)";
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative w-full overflow-hidden", className)}
      style={{
        height: 3,
        background: "var(--divider)",
        borderRadius: "var(--radius-sm)",
        ...style,
      }}
      {...rest}
    >
      {indeterminate ? (
        <>
          <style>{SWEEP_CSS}</style>
          <span
            className="hr-progress-sweep absolute top-0 block"
            style={{
              left: 0,
              height: "100%",
              width: "35%",
              background: color,
              boxShadow: glow,
              borderRadius: "var(--radius-sm)",
            }}
          />
        </>
      ) : (
        <span
          className="block"
          style={{
            height: "100%",
            width: `${clamped}%`,
            background: color,
            boxShadow: glow,
            borderRadius: "var(--radius-sm)",
            transition: "width var(--dur) var(--ease-out)",
          }}
        />
      )}
    </div>
  );
}
