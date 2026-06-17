"use client";

import  { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { HRIllustration, type IllustrationName } from "./hr-illustration";
import { Icon, type IconName } from "./icon";

export { HRIllustration } from "./hr-illustration";
export type { HRIllustrationProps, IllustrationName } from "./hr-illustration";

/** Centered empty-state: pack illustration + headline + sub-line + optional action. */
export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Pack illustration name, or a custom node. @default 'empty-radar' */
  // reason: ReactNode subsumes string, so IllustrationName is technically
  // redundant — but it's kept deliberately for autocomplete on the common
  // string case (the runtime narrows `typeof === "string"` to a pack name).
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  illustration?: IllustrationName | ReactNode;
  title?: string;
  description?: ReactNode;
  /** Action button label (omit for no button). */
  action?: string;
  actionIcon?: IconName;
  onAction?: () => void;
}

export function EmptyState({
  illustration = "empty-radar",
  title,
  description,
  action,
  actionIcon,
  onAction,
  className,
  style,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cn("mx-auto flex flex-col items-center text-center", className)}
      style={{ gap: 6, padding: "40px 24px", maxWidth: 380, ...style }}
      {...rest}
    >
      <div style={{ marginBottom: 14, opacity: 0.92 }}>
        {typeof illustration === "string" ? (
          <HRIllustration name={illustration as IllustrationName} size={120} />
        ) : (
          illustration
        )}
      </div>
      {title ? (
        <h3 style={{ font: "var(--text-h3)", color: "var(--text-hi)" }}>{title}</h3>
      ) : null}
      {description ? (
        <p className="m-0" style={{ font: "var(--text-sm)", color: "var(--text-body)" }}>
          {description}
        </p>
      ) : null}
      {action ? (
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={onAction}
            className="inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap transition hover:brightness-110 active:brightness-95"
            style={{
              height: "var(--control-h)",
              padding: "0 var(--pad-control-x)",
              font: "600 14px/1 var(--font-ui)",
              letterSpacing: "0.005em",
              color: "var(--bg-void)",
              background: "var(--accent)",
              border: "1px solid transparent",
              borderRadius: "var(--radius-control)",
              boxShadow: "var(--glow-phosphor)",
            }}
          >
            {actionIcon ? <Icon name={actionIcon} size={16} /> : null}
            {action}
          </button>
        </div>
      ) : null}
    </div>
  );
}
