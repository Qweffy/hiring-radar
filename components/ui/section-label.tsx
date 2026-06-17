import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

import type * as React from "react";

type SectionLabelTone = "low" | "phosphor" | "violet" | "amber";

/** Uppercase 11px mono terminal section label for chrome headers. */
export interface SectionLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** Optional leading icon. */
  icon?: IconName;
  /** @default 'low' */
  tone?: SectionLabelTone;
}

const TONES: Record<SectionLabelTone, string> = {
  low: "var(--text-label)",
  phosphor: "var(--phosphor)",
  violet: "var(--violet)",
  amber: "var(--amber)",
};

/**
 * SectionLabel — uppercase 11px mono terminal label for chrome headers.
 * e.g. "SIGNAL FEED", "LAST SWEEP 06:00 UTC".
 */
export function SectionLabel({ children, icon, tone = "low", className, style, ...rest }: SectionLabelProps) {
  return (
    <span
      className={cn("inline-flex items-center uppercase", className)}
      style={{
        gap: 6,
        font: "var(--label-mono)",
        letterSpacing: "var(--label-tracking)",
        color: TONES[tone],
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={13} strokeWidth={1.75} />}
      {children}
    </span>
  );
}
