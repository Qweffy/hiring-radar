"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Bot, CircleX, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type BannerTone = "amber" | "violet" | "red";

interface ToneSpec {
  color: string;
  bg: string;
  border: string;
  Icon: LucideIcon;
}

const TONES: Record<BannerTone, ToneSpec> = {
  amber: {
    color: "var(--warn)",
    bg: "var(--amber-14)",
    border: "color-mix(in srgb, var(--amber) 30%, transparent)",
    Icon: TriangleAlert,
  },
  violet: {
    color: "var(--ai)",
    bg: "var(--violet-12)",
    border: "color-mix(in srgb, var(--violet) 30%, transparent)",
    Icon: Bot,
  },
  red: {
    color: "var(--danger)",
    bg: "var(--red-14)",
    border: "color-mix(in srgb, var(--red) 30%, transparent)",
    Icon: CircleX,
  },
};

/**
 * Full-width banner under the topbar. amber = warning/stale, violet = AI
 * degraded, red = failure. Optional action button + dismiss.
 */
export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  /** @default 'amber' */
  tone?: BannerTone;
  children: ReactNode;
  /** Truthy renders an action button. */
  action?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
}

export function Banner({
  tone = "amber",
  children,
  action,
  actionLabel,
  onAction,
  onClose,
  className,
  style,
  ...rest
}: BannerProps) {
  const t = TONES[tone];
  const ToneIcon = t.Icon;
  return (
    <div
      role="alert"
      className={cn("flex w-full items-center gap-3", className)}
      style={{
        padding: "10px var(--space-4)",
        background: t.bg,
        borderTop: `1px solid ${t.border}`,
        borderBottom: `1px solid ${t.border}`,
        ...style,
      }}
      {...rest}
    >
      <ToneIcon
        size={16}
        strokeWidth={1.5}
        aria-hidden
        className="shrink-0"
        style={{ color: t.color }}
      />
      <span
        className="flex-1"
        style={{ font: "var(--text-sm)", color: "var(--text-hi)" }}
      >
        {children}
      </span>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex cursor-pointer items-center bg-transparent whitespace-nowrap"
          style={{
            gap: 5,
            border: `1px solid ${t.border}`,
            borderRadius: "var(--radius-sm)",
            padding: "5px 10px",
            font: "600 12px/1 var(--font-ui)",
            color: t.color,
          }}
        >
          {actionLabel ?? "Resolve"}
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="cursor-pointer border-none bg-transparent opacity-70 hover:opacity-100"
          style={{ padding: 2, color: t.color }}
        >
          <X size={16} strokeWidth={1.5} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
