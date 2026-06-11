"use client";

import * as React from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock,
  Command,
  Copy,
  Database,
  EllipsisVertical,
  ExternalLink,
  Funnel,
  Inbox,
  Info,
  List,
  MapPin,
  Pause,
  Play,
  Radar,
  RotateCcw,
  Search,
  Server,
  Settings,
  Signal,
  TriangleAlert,
  User,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon glyph names from the Hiring Radar set (mirrors the core Icon contract),
 * mapped to lucide-react components.
 */
export type IconName =
  | "search"
  | "radar"
  | "list"
  | "bookmark"
  | "bot"
  | "user"
  | "server"
  | "settings"
  | "play"
  | "pause"
  | "retry"
  | "external-link"
  | "copy"
  | "kebab"
  | "filter"
  | "close"
  | "check"
  | "alert-triangle"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "command"
  | "map-pin"
  | "clock"
  | "x-circle"
  | "arrow-right"
  | "bell"
  | "signal"
  | "zap"
  | "database"
  | "info"
  | "inbox";

const ICONS: Record<IconName, LucideIcon> = {
  search: Search,
  radar: Radar,
  list: List,
  bookmark: Bookmark,
  bot: Bot,
  user: User,
  server: Server,
  settings: Settings,
  play: Play,
  pause: Pause,
  retry: RotateCcw,
  "external-link": ExternalLink,
  copy: Copy,
  kebab: EllipsisVertical,
  filter: Funnel,
  close: X,
  check: Check,
  "alert-triangle": TriangleAlert,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  command: Command,
  "map-pin": MapPin,
  clock: Clock,
  "x-circle": CircleX,
  "arrow-right": ArrowRight,
  bell: Bell,
  signal: Signal,
  zap: Zap,
  database: Database,
  info: Info,
  inbox: Inbox,
};

export interface SegmentOption {
  value: string;
  label: string;
  icon?: IconName;
}

/** Mono segmented toggle for 2-4 mutually-exclusive modes (e.g. search mode). */
export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange?: (value: string) => void;
  /** @default 'md' */
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

/**
 * SegmentedControl — mono toggle between 2-4 modes
 * (e.g. search mode: SEMANTIC / KEYWORD / HYBRID).
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  size = "md",
  style,
}: SegmentedControlProps) {
  const height = size === "sm" ? 28 : 34;

  return (
    <div
      role="tablist"
      className="inline-flex"
      style={{
        padding: 3,
        gap: 2,
        height,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-control)",
        ...style,
      }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        const IconGlyph = opt.icon ? ICONS[opt.icon] : null;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(opt.value)}
            className="inline-flex h-full cursor-pointer items-center uppercase"
            style={{
              gap: 6,
              padding: "0 12px",
              background: selected ? "var(--phosphor-12)" : "transparent",
              color: selected ? "var(--accent)" : "var(--text-body)",
              border: selected
                ? "1px solid var(--border-strong)"
                : "1px solid transparent",
              borderRadius: "var(--radius-sm)",
              font: "600 11px/1 var(--font-mono)",
              letterSpacing: "0.08em",
              transition: "background var(--dur-fast), color var(--dur-fast)",
            }}
          >
            {IconGlyph && <IconGlyph size={14} strokeWidth={1.5} aria-hidden />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
