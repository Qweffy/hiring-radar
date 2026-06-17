"use client";

import { useState } from "react";
import  { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";


export type TooltipPosition = "top" | "bottom" | "left" | "right";

const POS: Record<TooltipPosition, CSSProperties> = {
  top: { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 8 },
  bottom: { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 8 },
  left: { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 8 },
  right: { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 8 },
};

/** Mono, instant tooltip wrapping a trigger element. Shows on hover/focus. */
export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  label: ReactNode;
  /** @default 'top' */
  position?: TooltipPosition;
  children: ReactNode;
}

export function Tooltip({
  label,
  position = "top",
  children,
  className,
  style,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn("relative inline-flex", className)}
      style={style}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        setOpen(true);
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        setOpen(false);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        setOpen(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setOpen(false);
      }}
      {...rest}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute z-[var(--z-dropdown)] whitespace-nowrap"
          style={{
            ...POS[position],
            padding: "5px 8px",
            font: "var(--mono-sm)",
            color: "var(--text-hi)",
            background: "var(--surface-card)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
