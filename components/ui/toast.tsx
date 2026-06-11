"use client";

import { useEffect, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import {
  Check,
  CircleX,
  Info,
  RotateCw,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "warning" | "info";

interface ToneSpec {
  color: string;
  Icon: LucideIcon;
  glow: boolean;
}

const TONES: Record<ToastTone, ToneSpec> = {
  success: { color: "var(--accent)", Icon: Check, glow: true },
  error: { color: "var(--danger)", Icon: CircleX, glow: true },
  warning: { color: "var(--warn)", Icon: TriangleAlert, glow: false },
  info: { color: "var(--cyan)", Icon: Info, glow: true },
};

/**
 * Transient notification on glass. Tones success/error/warning/info, plus
 * action variants: `retry`, and undo with a mono countdown ("Undo (8s)").
 */
export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  /** @default 'info' */
  tone?: ToastTone;
  title?: string;
  message?: ReactNode;
  /** Built-in action: 'retry' shows a Retry button. */
  action?: "retry" | (string & {});
  actionLabel?: string;
  onAction?: () => void;
  /** When set, shows "Undo (Ns)" with a live countdown. */
  undoSeconds?: number;
  onUndo?: () => void;
  onClose?: () => void;
}

export function Toast({
  tone = "info",
  title,
  message,
  action,
  actionLabel,
  onAction,
  undoSeconds,
  onUndo,
  onClose,
  className,
  style,
  ...rest
}: ToastProps) {
  const t = TONES[tone];
  const ToneIcon = t.Icon;

  const [secs, setSecs] = useState(undoSeconds ?? 0);
  // Reset the countdown when the prop changes (render-phase adjustment,
  // not setState-in-effect).
  const [prevUndoSeconds, setPrevUndoSeconds] = useState(undoSeconds);
  if (undoSeconds !== prevUndoSeconds) {
    setPrevUndoSeconds(undoSeconds);
    setSecs(undoSeconds ?? 0);
  }

  useEffect(() => {
    if (undoSeconds == null) return;
    const id = window.setInterval(() => {
      setSecs((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [undoSeconds]);

  return (
    <div
      role="status"
      className={cn("flex w-[360px] max-w-[90vw] items-start gap-3", className)}
      style={{
        padding: "12px 14px",
        background: "var(--surface-glass)",
        backdropFilter: "blur(var(--blur-glass))",
        WebkitBackdropFilter: "blur(var(--blur-glass))",
        border: "1px solid var(--border)",
        borderLeft: `2px solid ${t.color}`,
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-pop)",
        ...style,
      }}
      {...rest}
    >
      <span
        className="shrink-0"
        style={{
          color: t.color,
          marginTop: 1,
          filter: t.glow ? `drop-shadow(0 0 6px ${t.color})` : undefined,
        }}
      >
        <ToneIcon size={16} strokeWidth={1.5} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 2 }}>
        {title ? (
          <span style={{ font: "600 13px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
            {title}
          </span>
        ) : null}
        {message ? (
          <span style={{ font: "var(--text-sm)", color: "var(--text-body)" }}>
            {message}
          </span>
        ) : null}
        {action || undoSeconds != null ? (
          <div className="flex items-center gap-3" style={{ marginTop: 8 }}>
            {undoSeconds != null ? (
              <button
                type="button"
                onClick={onUndo}
                className="cursor-pointer border-none bg-transparent p-0"
                style={{ font: "var(--mono-sm)", color: t.color }}
              >
                Undo ({secs}s)
              </button>
            ) : null}
            {action ? (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex cursor-pointer items-center border-none bg-transparent p-0"
                style={{ gap: 5, font: "600 12px/1 var(--font-ui)", color: t.color }}
              >
                {action === "retry" ? (
                  <RotateCw size={16} strokeWidth={1.5} aria-hidden />
                ) : null}
                {actionLabel ?? (action === "retry" ? "Retry" : "Action")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="cursor-pointer border-none bg-transparent"
          style={{ padding: 2, color: "var(--text-muted)" }}
        >
          <X size={16} strokeWidth={1.5} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
