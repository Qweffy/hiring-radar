"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV, MAIN_NAV, activeNavKey, type ShellNavItem } from "@/components/shell/nav-items";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

import type * as React from "react";

const ROW_CLASS = cn(
  "flex items-center select-none",
  "[transition:background_var(--dur-fast),color_var(--dur-fast)]",
);

const ROW_STYLE: React.CSSProperties = {
  gap: 11,
  height: 38,
  padding: "0 12px 0 13px",
  borderRadius: "var(--radius-control)",
  font: "var(--text-sm)",
  fontWeight: 500,
  borderLeft: "3px solid transparent",
  whiteSpace: "nowrap",
};

function NavRow({ item, active }: { item: ShellNavItem; active: boolean }) {
  if (!item.enabled) {
    return (
      <div
        aria-disabled="true"
        className={ROW_CLASS}
        style={{ ...ROW_STYLE, color: "var(--text-low-content)", cursor: "default" }}
      >
        <Icon name={item.icon} size={20} />
        <span className="flex-1">{item.label}</span>
        <span
          style={{
            font: "var(--label-mono)",
            letterSpacing: "var(--label-tracking)",
            color: "var(--text-low)",
            border: "1px solid var(--divider)",
            borderRadius: "var(--radius-sm)",
            padding: "2px 5px",
          }}
        >
          SOON
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        ROW_CLASS,
        "no-underline hover:no-underline",
        !active && "hover:bg-[color-mix(in_srgb,var(--text-mid)_5%,transparent)]",
      )}
      style={{
        ...ROW_STYLE,
        ...(active
          ? {
              color: "var(--phosphor)",
              background: "var(--phosphor-08)",
              borderLeft: "3px solid var(--phosphor)",
              boxShadow:
                "inset 0 0 0 1px var(--phosphor-dim), 0 0 18px color-mix(in srgb, var(--phosphor) 12%, transparent)",
            }
          : { color: "var(--text-mid)" }),
      }}
    >
      <Icon name={item.icon} size={20} />
      <span className="flex-1">{item.label}</span>
      <span
        style={{
          font: "var(--mono-sm)",
          fontSize: 11,
          color: "var(--text-low)",
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}
      >
        {item.hint}
      </span>
    </Link>
  );
}

/** 248px persistent sidebar: logo row, main nav, pinned admin group. */
export function Sidebar() {
  const pathname = usePathname();
  const active = activeNavKey(pathname);

  return (
    <aside
      className="flex h-full shrink-0 flex-col"
      style={{
        width: "var(--sidebar-w)",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--divider)",
      }}
    >
      <div
        className="flex shrink-0 items-center"
        style={{ height: 56, padding: "0 16px", borderBottom: "1px solid var(--divider)" }}
      >
        <Link
          href="/"
          aria-label="hiring-radar — home"
          className="flex items-center no-underline hover:no-underline"
          style={{ gap: 10, color: "var(--text-hi)" }}
        >
          <HRIllustration
            name="mark"
            size={22}
            style={{ filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--phosphor) 35%, transparent))" }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 16,
              letterSpacing: "-0.02em",
              color: "var(--text-hi)",
            }}
          >
            hiring-radar
          </span>
        </Link>
      </div>

      <nav
        aria-label="Primary"
        className="flex min-h-0 flex-1 flex-col"
        style={{ gap: 2, padding: "12px 10px" }}
      >
        {MAIN_NAV.map((item) => (
          <NavRow key={item.key} item={item} active={active === item.key} />
        ))}
        <div className="flex-1" />
      </nav>

      <div style={{ padding: "0 14px" }}>
        <div style={{ height: 1, background: "var(--divider)" }} />
      </div>
      <div style={{ padding: "6px 10px 4px" }}>
        <span className="hr-label" style={{ paddingLeft: 6 }}>
          Admin
        </span>
      </div>
      <nav
        aria-label="Admin"
        className="flex flex-col"
        style={{ gap: 2, padding: "0 10px 14px" }}
      >
        {ADMIN_NAV.map((item) => (
          <NavRow key={item.key} item={item} active={active === item.key} />
        ))}
      </nav>
    </aside>
  );
}
