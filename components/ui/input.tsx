"use client";

import { TriangleAlert } from "lucide-react";
import * as React from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Text input with optional leading icon, mono mode, and error state. */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  icon?: IconName;
  /** Error message (string) renders red border + message; `true` = border only. */
  error?: string | boolean;
  /** Render value in JetBrains Mono (for data entry). @default false */
  mono?: boolean;
  /** @default 'md' */
  size?: "sm" | "md" | "lg";
}

const HEIGHTS: Record<NonNullable<InputProps["size"]>, string> = {
  sm: "var(--control-h-sm)",
  md: "var(--control-h)",
  lg: "var(--control-h-lg)",
};

const INPUT_CSS = `
.hr-input {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  transition: border-color var(--dur-fast), box-shadow var(--dur);
}
.hr-input:focus-within {
  border-color: var(--border-strong);
  box-shadow: var(--glow-phosphor-sm);
}
.hr-input[data-error] {
  border-color: var(--red);
  box-shadow: var(--glow-red);
}
@media (prefers-reduced-motion: reduce) {
  .hr-input { transition: none; }
}
`;

export function Input({
  icon,
  error,
  mono = false,
  size = "md",
  disabled = false,
  className,
  style,
  ...rest
}: InputProps): React.JSX.Element {
  return (
    <div
      className={cn("flex w-full flex-col", className)}
      style={{ gap: 6, ...style }}
    >
      <style href="hr-input" precedence="medium">
        {INPUT_CSS}
      </style>
      <div
        className="hr-input flex items-center"
        data-error={error ? "" : undefined}
        style={{
          gap: 8,
          height: HEIGHTS[size],
          padding: "0 12px",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {icon && (
          <Icon name={icon} size={16} style={{ color: "var(--text-low-content)" }} />
        )}
        <input
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-hi)",
            font: mono ? "var(--mono-base)" : "var(--text-base)",
            letterSpacing: mono ? "0" : "normal",
          }}
          {...rest}
        />
      </div>
      {typeof error === "string" && error.length > 0 && (
        <span
          className="inline-flex items-center"
          style={{ gap: 6, font: "var(--text-xs)", color: "var(--red)" }}
        >
          <TriangleAlert size={13} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}
