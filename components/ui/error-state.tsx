"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { HRIllustration } from "./hr-illustration";

/**
 * Recovery-oriented error pattern. Always renders a recovery action and a
 * plain-language cause — never a stack trace. Full uses the LOST SIGNAL
 * illustration; compact (inline/widget) uses STATIC INTERFERENCE or none.
 */
export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Plain-language cause headline. @default "Couldn't reach the database" */
  cause?: string;
  /** Optional secondary explanation. */
  detail?: ReactNode;
  /** @default 'red' */
  tone?: "red" | "amber";
  onRetry?: () => void;
  retryLabel?: string;
  /** Inline/widget sizing with the STATIC INTERFERENCE asset. @default false */
  compact?: boolean;
  /** Drop the illustration entirely (regions under ~200px). @default false */
  hideIllustration?: boolean;
}

export function ErrorState({
  cause = "Couldn't reach the database",
  detail,
  tone = "red",
  onRetry,
  retryLabel = "Retry",
  compact = false,
  hideIllustration = false,
  className,
  style,
  ...rest
}: ErrorStateProps) {
  // `tone` is part of the contract; the canonical artwork already carries the
  // red/amber signal colors, so it has no extra visual effect (as designed).
  void tone;
  return (
    <div
      role="alert"
      className={cn("mx-auto flex flex-col items-center text-center", className)}
      style={{
        gap: 6,
        padding: compact ? "20px 16px" : "40px 24px",
        maxWidth: compact ? 320 : 400,
        ...style,
      }}
      {...rest}
    >
      {!hideIllustration ? (
        <div style={{ marginBottom: compact ? 10 : 14 }}>
          <HRIllustration
            name={compact ? "static-interference" : "lost-signal"}
            size={compact ? 84 : 116}
          />
        </div>
      ) : null}
      <h3
        style={{
          font: compact ? "var(--text-base)" : "var(--text-h3)",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          color: "var(--text-hi)",
        }}
      >
        {cause}
      </h3>
      {detail ? (
        <p className="m-0" style={{ font: "var(--text-sm)", color: "var(--text-body)" }}>
          {detail}
        </p>
      ) : null}
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap bg-transparent transition hover:bg-[var(--phosphor-08)] active:bg-[var(--phosphor-12)]"
          style={{
            height: "var(--control-h)",
            padding: "0 var(--pad-control-x)",
            font: "500 14px/1 var(--font-ui)",
            letterSpacing: "0.005em",
            color: "var(--text-hi)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-control)",
          }}
        >
          <RotateCw size={16} strokeWidth={1.5} aria-hidden />
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
