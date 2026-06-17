import type { IconName } from "@/components/ui/icon";

export type NavKey =
  | "radar"
  | "browse"
  | "shortlist"
  | "agent"
  | "profile"
  | "pipeline"
  | "settings";

export interface ShellNavItem {
  key: NavKey;
  label: string;
  href: string;
  icon: IconName;
  /** Chord hint, e.g. "g b" — rendered in the nav row and the palette. */
  hint: string;
  /** Routes that exist in M1. Disabled rows render a mono SOON tag. */
  enabled: boolean;
}

export const MAIN_NAV: ShellNavItem[] = [
  { key: "radar", label: "Radar", href: "/", icon: "radar", hint: "g d", enabled: true },
  { key: "browse", label: "Browse", href: "/browse", icon: "search", hint: "g b", enabled: true },
  { key: "shortlist", label: "Shortlist", href: "/shortlist", icon: "bookmark", hint: "g s", enabled: true },
  { key: "agent", label: "Agent Runs", href: "/agent", icon: "bot", hint: "g r", enabled: true },
  { key: "profile", label: "Profile", href: "/profile", icon: "user", hint: "g u", enabled: true },
];

export const ADMIN_NAV: ShellNavItem[] = [
  { key: "pipeline", label: "Pipeline", href: "/pipeline", icon: "server", hint: "g p", enabled: true },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings", hint: "g ,", enabled: false },
];

/** Derive the active nav item from the current pathname. */
export function activeNavKey(pathname: string): NavKey | null {
  const match = [...MAIN_NAV, ...ADMIN_NAV].find((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.key ?? null;
}
