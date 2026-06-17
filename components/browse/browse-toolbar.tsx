"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  BrowseFilters,
  RemoteValue,
  SearchMode,
} from "@/lib/browse-params";
import type { BrowseResult } from "@/lib/queries/postings";
import { formatMonth } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import { ProgressLine } from "@/components/ui/progress-line";
import { RangeSlider } from "@/components/ui/range-slider";
import { SearchInput } from "@/components/ui/search-input";
import { Tag } from "@/components/ui/tag";
import { Tooltip } from "@/components/ui/tooltip";
import { FilterChip, chipButtonStyle } from "@/components/browse/filter-chip";

export interface BrowseToolbarProps {
  filters: BrowseFilters;
  result: BrowseResult;
  isPending: boolean;
  onPatch: (patch: Partial<BrowseFilters>) => void;
  onClearAll: () => void;
}

const REMOTE_OPTIONS: { value: RemoteValue; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const SALARY_FLOORS = [50_000, 75_000, 100_000, 125_000, 150_000, 175_000, 200_000];

const floorLabel = (floor: number): string => `$${floor / 1000}k+`;

const SEARCH_MODE_OPTIONS: { value: SearchMode; label: string }[] = [
  { value: "exact", label: "Exact" },
  { value: "semantic", label: "Semantic" },
  { value: "hybrid", label: "Hybrid" },
];

interface SearchModeControlProps {
  mode: SearchMode;
  /** Mode only applies with a query — the control is inert when q is empty. */
  enabled: boolean;
  onChange: (mode: SearchMode) => void;
}

/** Search-mode toggle: [EXACT | SEMANTIC | HYBRID], URL-driven via onChange. */
function SearchModeControl({ mode, enabled, onChange }: SearchModeControlProps) {
  const control = (
    <div
      role="radiogroup"
      aria-label="Search mode"
      aria-disabled={!enabled}
      className="inline-flex shrink-0"
      style={{
        padding: 3,
        gap: 2,
        height: 28,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-control)",
        opacity: enabled ? 1 : 0.5,
        pointerEvents: enabled ? undefined : "none",
      }}
    >
      {SEARCH_MODE_OPTIONS.map((option) => {
        const active = enabled && option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!enabled}
            onClick={() => onChange(option.value)}
            className={enabled ? "cursor-pointer" : "pointer-events-none"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "100%",
              padding: "0 10px",
              background: active ? "var(--phosphor-12)" : "transparent",
              color: active ? "var(--phosphor)" : "var(--text-low)",
              border: active
                ? "1px solid var(--border-strong)"
                : "1px solid transparent",
              borderRadius: "var(--radius-sm)",
              font: "600 11px/1 var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  if (enabled) return control;
  return (
    <Tooltip label="enter a query to switch modes" tabIndex={0} className="cursor-not-allowed">
      {control}
    </Tooltip>
  );
}

/** Step the Match ≥ slider moves in. */
const MATCH_STEP = 5;

interface MatchChipProps {
  /** Active floor (0-100), or null when the filter is off. */
  value: number | null;
  onChange: (value: number | null) => void;
}

/**
 * Violet "Match ≥" filter chip → a popover holding a phosphor-... no, violet
 * range slider that floors postings by the agent's assessment score. Off by
 * default (null); the slider edits a draft and commits to the URL on release.
 */
function MatchChip({ value, onChange }: MatchChipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const active = value !== null;
  // Draft mirrors the slider while dragging; commits on pointer/key release.
  const [draft, setDraft] = useState(value ?? 80);
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setDraft(value ?? 80);
    setSyncedValue(value);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const violetChipStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    height: 30,
    padding: "0 12px",
    background: active ? "var(--violet-12)" : "transparent",
    border: `1px solid ${
      active
        ? "color-mix(in srgb, var(--violet) 50%, transparent)"
        : "var(--border)"
    }`,
    borderRadius: "var(--radius-control)",
    font: "var(--mono-sm)",
    color: active ? "var(--violet)" : "var(--text-mid)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "border-color var(--dur-fast), background var(--dur-fast)",
  };

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="hover:[border-color:color-mix(in_srgb,var(--violet)_50%,transparent)]"
        style={violetChipStyle}
      >
        <Icon name="bot" size={13} />
        {active ? `Match ≥ ${value}` : "Match ≥"}
        <Icon name="chevron-down" size={13} style={{ opacity: 0.6 }} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Filter by agent match score"
          className="absolute left-0 top-full"
          style={{
            zIndex: "var(--z-dropdown)",
            marginTop: 6,
            width: 248,
            padding: 14,
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-control)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <RangeSlider
            label="Agent match floor"
            min={0}
            max={100}
            step={MATCH_STEP}
            value={draft}
            onChange={(event) => setDraft(Number(event.target.value))}
            onPointerUp={() => onChange(draft)}
            onKeyUp={() => onChange(draft)}
            format={(v) => `≥ ${v}`}
          />
          <div
            className="flex items-center justify-between"
            style={{ marginTop: 12 }}
          >
            <span style={{ font: "var(--text-xs)", color: "var(--text-low-content)" }}>
              Only assessed postings
            </span>
            <button
              type="button"
              onClick={() => {
                setDraft(80);
                onChange(null);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="cursor-pointer bg-transparent"
              style={{
                padding: 0,
                border: "none",
                font: "var(--text-xs)",
                color: active ? "var(--cyan)" : "var(--text-low)",
                cursor: active ? "pointer" : "default",
              }}
              disabled={!active}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
}

export function BrowseToolbar({
  filters,
  result,
  isPending,
  onPatch,
  onClearAll,
}: BrowseToolbarProps) {
  // Local query state, debounced 300ms into the URL. Synced back when the URL
  // changes externally (back/forward) — guarded so it never clobbers typing.
  const [query, setQuery] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
  if (filters.q !== syncedQ) {
    if (query === syncedQ) setQuery(filters.q);
    setSyncedQ(filters.q);
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const commitQuery = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    onPatch({ q: value });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitQuery(value), 300);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchBoxRef.current?.querySelector("input")?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const activeMonthLabel = result.month !== null ? formatMonth(result.month) : "—";

  const activeChips: { key: string; node: ReactNode }[] = [];
  if (filters.q.length > 0) {
    activeChips.push({
      key: "q",
      node: (
        <Tag
          tone="phosphor"
          onRemove={() => {
            setQuery("");
            commitQuery("");
          }}
        >
          {filters.q}
        </Tag>
      ),
    });
  }
  if (filters.month !== null) {
    activeChips.push({
      key: "month",
      node: (
        <Tag tone="phosphor" onRemove={() => onPatch({ month: null })}>
          {formatMonth(filters.month)}
        </Tag>
      ),
    });
  }
  for (const value of filters.remote) {
    activeChips.push({
      key: `remote-${value}`,
      node: (
        <Tag
          onRemove={() =>
            onPatch({ remote: filters.remote.filter((v) => v !== value) })
          }
        >
          {value.toUpperCase()}
        </Tag>
      ),
    });
  }
  if (filters.salaryMin !== null) {
    activeChips.push({
      key: "salary",
      node: (
        <Tag onRemove={() => onPatch({ salaryMin: null })}>
          ≥ {floorLabel(filters.salaryMin).replace("+", "")}
        </Tag>
      ),
    });
  }
  for (const tag of filters.stack) {
    activeChips.push({
      key: `stack-${tag}`,
      node: (
        <Tag onRemove={() => onPatch({ stack: filters.stack.filter((t) => t !== tag) })}>
          {tag}
        </Tag>
      ),
    });
  }
  if (filters.visa) {
    activeChips.push({
      key: "visa",
      node: (
        <Tag tone="violet" onRemove={() => onPatch({ visa: false })}>
          VISA
        </Tag>
      ),
    });
  }
  if (filters.matchMin !== null) {
    activeChips.push({
      key: "matchMin",
      node: (
        <Tag tone="violet" onRemove={() => onPatch({ matchMin: null })}>
          MATCH ≥ {filters.matchMin}
        </Tag>
      ),
    });
  }

  return (
    <div
      className="relative z-20 shrink-0"
      style={{
        padding: "16px 24px 14px",
        background: "var(--glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--divider)",
      }}
    >
      {/* Search row */}
      <div className="flex items-center" style={{ gap: 12 }}>
        <div ref={searchBoxRef} className="min-w-0 flex-1">
          <SearchInput
            size="lg"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onClear={() => {
              setQuery("");
              commitQuery("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitQuery(query);
            }}
            aria-label="Scan postings"
          />
        </div>
        <SearchModeControl
          mode={filters.mode}
          enabled={query.trim().length > 0}
          onChange={(mode) => onPatch({ mode })}
        />
      </div>

      {/* Filter triggers row */}
      <div className="flex flex-wrap items-center" style={{ gap: 10, marginTop: 14 }}>
        <FilterChip
          label={activeMonthLabel}
          icon="clock"
          active
          mode="single"
          mono
          options={result.availableMonths.map((m) => ({
            value: m,
            label: formatMonth(m),
          }))}
          selected={result.month !== null ? [result.month] : []}
          onChange={(values) => {
            const picked = values[0] ?? null;
            // Latest month is the default — keep the URL clean for it.
            onPatch({
              month: picked === result.availableMonths[0] ? null : picked,
            });
          }}
        />
        <FilterChip
          label="Remote"
          active={filters.remote.length > 0}
          mode="multi"
          options={REMOTE_OPTIONS}
          selected={filters.remote}
          onChange={(values) =>
            onPatch({
              remote: REMOTE_OPTIONS.map((o) => o.value).filter((v) =>
                values.includes(v),
              ),
            })
          }
        />
        <FilterChip
          label={
            filters.salaryMin !== null
              ? `Salary ≥ ${floorLabel(filters.salaryMin).replace("+", "")}`
              : "Salary"
          }
          active={filters.salaryMin !== null}
          mode="single"
          mono
          options={SALARY_FLOORS.map((floor) => ({
            value: String(floor),
            label: floorLabel(floor),
          }))}
          selected={filters.salaryMin !== null ? [String(filters.salaryMin)] : []}
          onChange={(values) =>
            onPatch({ salaryMin: values[0] ? Number(values[0]) : null })
          }
        />
        <FilterChip
          label="Stack"
          active={filters.stack.length > 0}
          mode="multi"
          mono
          options={result.availableStacks.map((tag) => ({ value: tag, label: tag }))}
          selected={filters.stack}
          onChange={(values) => onPatch({ stack: values })}
        />
        <button
          type="button"
          aria-pressed={filters.visa}
          onClick={() => onPatch({ visa: !filters.visa })}
          className="hover:[border-color:var(--border-strong)]"
          style={chipButtonStyle(filters.visa)}
        >
          Visa
        </button>
        <MatchChip
          value={filters.matchMin}
          onChange={(matchMin) => onPatch({ matchMin })}
        />
        <div className="flex-1" />
        <span
          className="whitespace-nowrap"
          style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}
        >
          <span style={{ color: "var(--phosphor)" }}>{result.total}</span>
          {" / "}
          {result.totalInMonth} POSTINGS
        </span>
      </div>

      {/* Active filter chips row */}
      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 12 }}>
          <span className="hr-label" style={{ marginRight: 2 }}>
            Active
          </span>
          {activeChips.map((chip) => (
            <span key={chip.key}>{chip.node}</span>
          ))}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              if (debounceRef.current) clearTimeout(debounceRef.current);
              onClearAll();
            }}
            className="cursor-pointer bg-transparent"
            style={{
              marginLeft: 4,
              padding: 0,
              border: "none",
              font: "var(--text-xs)",
              color: "var(--cyan)",
            }}
          >
            Clear all
          </button>
        </div>
      ) : null}

      {/* Re-query progress — pinned under the toolbar, list never blanks */}
      {isPending ? (
        <div className="absolute inset-x-0 bottom-0">
          <ProgressLine indeterminate aria-label="Scanning" style={{ height: 2 }} />
        </div>
      ) : null}
    </div>
  );
}
