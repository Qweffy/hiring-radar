"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** Styled native <select>. Pass <option> children. */
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  error?: boolean;
  /** @default 'md' */
  size?: "sm" | "md" | "lg";
}

const HEIGHTS: Record<NonNullable<SelectProps["size"]>, string> = {
  sm: "var(--control-h-sm)",
  md: "var(--control-h)",
  lg: "var(--control-h-lg)",
};

const SELECT_CSS = `
.hr-select {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  transition: border-color var(--dur-fast), box-shadow var(--dur);
}
.hr-select:focus-within {
  border-color: var(--border-strong);
  box-shadow: var(--glow-phosphor-sm);
}
.hr-select[data-error],
.hr-select[data-error]:focus-within {
  border-color: var(--red);
}
@media (prefers-reduced-motion: reduce) {
  .hr-select { transition: none; }
}
`;

export function Select({
  error = false,
  size = "md",
  disabled = false,
  className,
  style,
  children,
  ...rest
}: SelectProps): React.JSX.Element {
  return (
    <div
      className={cn("hr-select relative inline-flex w-full items-center", className)}
      data-error={error ? "" : undefined}
      style={{
        height: HEIGHTS[size],
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      <style href="hr-select" precedence="medium">
        {SELECT_CSS}
      </style>
      <select
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          flex: 1,
          height: "100%",
          padding: "0 34px 0 12px",
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-hi)",
          font: "var(--text-base)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={1.5}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ right: 10, color: "var(--text-low-content)" }}
      />
    </div>
  );
}
