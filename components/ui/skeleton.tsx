import  { type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";


export type SkeletonVariant = "text" | "row" | "card" | "radar";

/**
 * Phosphor-tinted shimmer placeholder; static under reduced-motion (the
 * global .hr-skeleton class degrades its animation automatically).
 */
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** @default 'text' */
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  /** Line count for variant="text". @default 3 */
  lines?: number;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  lines = 3,
  className,
  style,
  ...rest
}: SkeletonProps) {
  if (variant === "text") {
    return (
      <div
        className={cn("flex flex-col gap-2", className)}
        style={{ width: width ?? "100%", ...style }}
        {...rest}
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="hr-skeleton"
            style={{ height: 11, width: i === lines - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div
        className={cn("flex items-center gap-4", className)}
        style={{
          padding: 14,
          border: "var(--border-1)",
          borderRadius: "var(--radius-card)",
          background: "var(--surface-card)",
          ...style,
        }}
        {...rest}
      >
        <div className="flex flex-1 flex-col" style={{ gap: 9 }}>
          <div className="hr-skeleton" style={{ height: 13, width: "45%" }} />
          <div className="hr-skeleton" style={{ height: 10, width: "70%" }} />
        </div>
        <div
          className="hr-skeleton shrink-0"
          style={{ width: 40, height: 40, borderRadius: "50%" }}
        />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn("flex flex-col gap-3", className)}
        style={{
          padding: "var(--pad-card)",
          border: "var(--border-1)",
          borderRadius: "var(--radius-card)",
          background: "var(--surface-card)",
          minWidth: 150,
          ...style,
        }}
        {...rest}
      >
        <div className="hr-skeleton" style={{ height: 9, width: "40%" }} />
        <div className="hr-skeleton" style={{ height: 30, width: "70%" }} />
        <div className="hr-skeleton" style={{ height: 9, width: "55%" }} />
      </div>
    );
  }

  // radar — circular sweep placeholder
  return (
    <div className={cn("inline-flex", className)} style={style} {...rest}>
      <div
        className="hr-skeleton"
        style={{ width: width ?? 120, height: height ?? 120, borderRadius: "50%" }}
      />
    </div>
  );
}
