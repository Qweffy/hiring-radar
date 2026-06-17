"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeNavKey } from "@/components/shell/nav-items";
import { Icon, type IconName } from "@/components/ui/icon";

interface Tab {
  key: "radar" | "browse" | "shortlist" | "agent";
  label: string;
  href: string;
  icon: IconName;
}

const TABS: Tab[] = [
  { key: "radar", label: "Radar", href: "/", icon: "radar" },
  { key: "browse", label: "Browse", href: "/browse", icon: "search" },
  { key: "shortlist", label: "Shortlist", href: "/shortlist", icon: "bookmark" },
  { key: "agent", label: "Agent", href: "/agent", icon: "bot" },
];

/** Keys that live behind the More sheet — highlight More when on one of them. */
const MORE_KEYS = new Set(["profile", "pipeline", "settings"]);

const TAB_STYLE = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  height: "100%",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
} as const;

const LABEL_STYLE = {
  font: "600 9px/1 var(--font-mono)",
  letterSpacing: "0.04em",
} as const;

export interface MobileTabBarProps {
  onOpenMore: () => void;
  moreOpen: boolean;
}

/** Bottom tab bar (mobile only). Radar / Browse / Shortlist / Agent + More. */
export function MobileTabBar({ onOpenMore, moreOpen }: MobileTabBarProps) {
  const pathname = usePathname();
  const active = activeNavKey(pathname);
  const moreActive = moreOpen || (active !== null && MORE_KEYS.has(active));

  return (
    <nav
      aria-label="Primary"
      className="hr-mobile-chrome"
      style={{
        alignItems: "center",
        height: 62,
        flexShrink: 0,
        padding: "0 8px calc(6px + env(safe-area-inset-bottom))",
        background: "var(--glass)",
        backdropFilter: "blur(var(--blur-glass))",
        WebkitBackdropFilter: "blur(var(--blur-glass))",
        borderTop: "1px solid var(--divider)",
      }}
    >
      {TABS.map((tab) => {
        const on = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            style={{ ...TAB_STYLE, color: on ? "var(--phosphor)" : "var(--text-low)" }}
          >
            <Icon name={tab.icon} size={22} />
            <span style={LABEL_STYLE}>{tab.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMore}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        style={{ ...TAB_STYLE, color: moreActive ? "var(--phosphor)" : "var(--text-low)" }}
      >
        <Icon name="more" size={22} />
        <span style={LABEL_STYLE}>More</span>
      </button>
    </nav>
  );
}
