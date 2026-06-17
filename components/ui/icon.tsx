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
  RotateCw,
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

import type * as React from "react";

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

const LUCIDE_BY_NAME: Record<IconName, LucideIcon> = {
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
  retry: RotateCw,
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

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon glyph name from the Hiring Radar set. */
  name: IconName;
  /** Pixel size (width = height). Use 16 or 20. @default 20 */
  size?: number;
  /** Stroke width. @default 1.5 */
  strokeWidth?: number;
}

/**
 * Icon — thin typed wrapper over lucide-react. Stroke glyph in currentColor,
 * never filled. Screens may use this wrapper or lucide-react directly.
 */
export function Icon({ name, size = 20, strokeWidth = 1.5, style, ...rest }: IconProps) {
  const Glyph = LUCIDE_BY_NAME[name];
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0, ...style }}
      {...rest}
    />
  );
}
