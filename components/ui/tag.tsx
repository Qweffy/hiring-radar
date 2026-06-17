"use client";

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
import  { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";


/**
 * Icon glyph names from the Hiring Radar set (mirrors the core Icon contract).
 * Mapped to lucide-react components below.
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

export type TagTone = "neutral" | "phosphor" | "cyan" | "violet" | "amber";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  /** @default 'neutral' */
  tone?: TagTone;
  icon?: IconName;
  /** When provided, renders an x that calls this. Turns the tag into a filter chip. */
  onRemove?: () => void;
  selected?: boolean;
}

interface ToneStyle {
  color: string;
  border: string;
  bg: string;
}

const TONES: Record<TagTone, ToneStyle> = {
  neutral: { color: "var(--text-mid)", border: "var(--border)", bg: "transparent" },
  phosphor: {
    color: "var(--phosphor)",
    border: "var(--border-strong)",
    bg: "var(--phosphor-08)",
  },
  cyan: {
    color: "var(--cyan)",
    border: "color-mix(in srgb, var(--cyan) 35%, transparent)",
    bg: "var(--cyan-12)",
  },
  violet: {
    color: "var(--violet)",
    border: "color-mix(in srgb, var(--violet) 40%, transparent)",
    bg: "var(--violet-12)",
  },
  amber: {
    color: "var(--amber)",
    border: "color-mix(in srgb, var(--amber) 38%, transparent)",
    bg: "var(--amber-14)",
  },
};

/** Mono outline chip — stack tags ("Rust", "k8s") and removable filter chips. */
export function Tag({
  children,
  tone = "neutral",
  icon,
  onRemove,
  selected = false,
  className,
  style,
  ...rest
}: TagProps) {
  const t = TONES[tone];
  const IconGlyph = icon ? ICONS[icon] : null;

  // `selected` on the neutral tone gets phosphor emphasis (the prototype's
  // selected branch was visually inert); colored tones keep their own fill.
  const isNeutralSelected = selected && tone === "neutral";
  const chipStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 24,
    padding: "0 8px",
    font: "var(--mono-sm)",
    color: isNeutralSelected ? "var(--phosphor)" : t.color,
    background: isNeutralSelected ? "var(--phosphor-08)" : t.bg,
    border: `1px solid ${isNeutralSelected ? "var(--border-strong)" : t.border}`,
    borderRadius: "var(--radius-sm)",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    ...style,
  };

  return (
    <span className={cn(className)} style={chipStyle} {...rest}>
      {IconGlyph && <IconGlyph size={13} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="inline-flex cursor-pointer opacity-70 transition-opacity hover:opacity-100"
          style={{
            marginRight: -3,
            padding: 1,
            background: "none",
            border: "none",
            color: "inherit",
          }}
        >
          <X size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
