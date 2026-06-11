"use client";

import type { CSSProperties, HTMLAttributes, KeyboardEvent, MouseEvent } from "react";
import { Bookmark, EllipsisVertical, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { StatusBadge, type StatusValue } from "@/components/ui/status-badge";
import { Tag } from "@/components/ui/tag";

export interface JobRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  company: string;
  role: string;
  /** Salary string — rendered in mono (e.g. "$180–220K"). */
  salary?: string;
  location?: string;
  /** Stack tags. */
  tags?: string[];
  /** Status badges (e.g. ['NEW','REMOTE','VISA']). */
  badges?: (StatusValue | string)[];
  /** Match score 0-100; renders a ScoreGauge. */
  score?: number;
  selected?: boolean;
  /** Amber dot — edited/stale since last sweep. */
  stale?: boolean;
  bookmarked?: boolean;
  onSelect?: () => void;
  onBookmark?: () => void;
}

const MAX_VISIBLE_TAGS = 4;

interface RowActionButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  filled?: boolean;
  onClick?: () => void;
}

// Inline equivalent of the core IconButton (ghost / sm) so this group has no
// dependency on the core component group.
function RowActionButton({ icon: Icon, label, active = false, filled = false, onClick }: RowActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      onClick={onClick}
      className="inline-flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center border border-transparent p-0 hover:bg-[color-mix(in_srgb,var(--text-mid)_8%,transparent)]"
      style={{
        color: active ? "var(--phosphor)" : "var(--text-body)",
        background: active ? "var(--phosphor-12)" : undefined,
        borderColor: active ? "var(--border-strong)" : undefined,
        borderRadius: "var(--radius-control)",
        transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast)",
      }}
    >
      <Icon size={16} strokeWidth={1.5} fill={filled ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}

/**
 * A single job posting row: company, role, mono salary, location, stack tags,
 * status badges, and a match gauge. Hover glows the border.
 */
export function JobRow({
  company,
  role,
  salary,
  location,
  tags = [],
  badges = [],
  score,
  selected = false,
  stale = false,
  bookmarked = false,
  onSelect,
  onBookmark,
  className,
  style,
  onClick,
  onKeyDown,
  ...rest
}: JobRowProps) {
  const handleClick = (e: MouseEvent<HTMLDivElement>): void => {
    onClick?.(e);
    if (!e.defaultPrevented) onSelect?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (onSelect && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSelect();
    }
  };

  const rowStyle: CSSProperties = {
    background: selected ? "var(--phosphor-08)" : "var(--bg-raised)",
    borderColor: selected ? "var(--border-strong)" : undefined,
    boxShadow: selected ? "var(--glow-phosphor-sm)" : undefined,
    borderRadius: "var(--radius-card)",
    transition:
      "border-color var(--dur-fast), box-shadow var(--dur), background var(--dur-fast)",
    ...style,
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onSelect ? 0 : undefined}
      className={cn(
        "grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-4 border border-[var(--border)] px-3.5 py-3",
        "hover:border-[var(--border-strong)] hover:shadow-[var(--glow-phosphor-sm)]",
        className,
      )}
      style={rowStyle}
      {...rest}
    >
      {/* main */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {stale && (
            <span
              title="Edited since last sweep"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--amber)",
                boxShadow: "0 0 8px color-mix(in srgb, var(--amber) 60%, transparent)",
                flexShrink: 0,
              }}
            />
          )}
          <span
            className="truncate"
            style={{ font: "var(--text-h3)", color: "var(--text-hi)" }}
          >
            {company}
          </span>
          <span style={{ color: "var(--text-low)" }}>·</span>
          <span
            className="truncate"
            style={{ font: "var(--text-base)", color: "var(--text-body)" }}
          >
            {role}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {salary && (
            <span style={{ font: "var(--mono-base)", color: "var(--phosphor)" }}>{salary}</span>
          )}
          {location && (
            <span
              className="inline-flex items-center gap-1"
              style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}
            >
              {location}
            </span>
          )}
          {badges.map((b) => (
            <StatusBadge key={b} status={b} />
          ))}
          {tags.slice(0, MAX_VISIBLE_TAGS).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
          {tags.length > MAX_VISIBLE_TAGS && (
            <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
              +{tags.length - MAX_VISIBLE_TAGS}
            </span>
          )}
        </div>
      </div>
      {/* score */}
      {score != null && <ScoreGauge score={score} size={48} />}
      {/* actions */}
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <RowActionButton
          icon={Bookmark}
          label={bookmarked ? "Saved" : "Save"}
          active={bookmarked}
          filled={bookmarked}
          onClick={onBookmark}
        />
        <RowActionButton icon={EllipsisVertical} label="More" />
      </div>
    </div>
  );
}
