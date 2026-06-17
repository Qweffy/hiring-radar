"use client";

import Link from "next/link";

import { HRIllustration } from "@/components/ui/hr-illustration";

export interface MobileHeaderProps {
  onOpenMore: () => void;
}

/** Compact mobile header (mobile only): logo + wordmark left, "NM" account
 * chip right. The desktop topbar's ⌘K trigger, month selector and sweep dot
 * drop on mobile — search lives on Browse, month scoping in its filters. */
export function MobileHeader({ onOpenMore }: MobileHeaderProps) {
  return (
    <header
      className="hr-mobile-chrome items-center justify-between"
      style={{
        flexShrink: 0,
        height: 50,
        padding: "0 16px",
        borderBottom: "1px solid var(--divider)",
        background: "var(--bg-surface)",
      }}
    >
      <Link
        href="/"
        aria-label="hiring-radar — home"
        className="flex items-center no-underline hover:no-underline"
        style={{ gap: 9, color: "var(--text-hi)" }}
      >
        <HRIllustration
          name="mark"
          size={20}
          style={{
            filter:
              "drop-shadow(0 0 6px color-mix(in srgb, var(--phosphor) 35%, transparent))",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: "-0.02em",
            color: "var(--text-hi)",
          }}
        >
          hiring-radar
        </span>
      </Link>

      <button
        type="button"
        onClick={onOpenMore}
        aria-label="Account and more"
        aria-haspopup="dialog"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-control)",
          color: "var(--text-mid)",
          font: "600 11px/1 var(--font-mono)",
          letterSpacing: "0.04em",
          cursor: "pointer",
        }}
      >
        NM
      </button>
    </header>
  );
}
