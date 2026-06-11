"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BrowseFilters, RemoteValue } from "@/lib/browse-params";
import type { BrowseResult } from "@/lib/queries/postings";
import { formatMonth } from "@/lib/format";
import { ProgressLine } from "@/components/ui/progress-line";
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

const SEARCH_MODES = [
  { value: "hybrid", label: "Hybrid", disabled: true },
  { value: "exact", label: "Exact", disabled: false },
  { value: "semantic", label: "Semantic", disabled: true },
] as const;

/** Search-mode toggle: EXACT live; HYBRID/SEMANTIC arrive in M2 (disabled). */
function SearchModeControl() {
  return (
    <div
      role="radiogroup"
      aria-label="Search mode"
      className="inline-flex shrink-0"
      style={{
        padding: 3,
        gap: 2,
        height: 28,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-control)",
      }}
    >
      {SEARCH_MODES.map((mode) => {
        const segment = (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={!mode.disabled}
            disabled={mode.disabled}
            className={mode.disabled ? "pointer-events-none" : "cursor-default"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "100%",
              padding: "0 10px",
              background: mode.disabled ? "transparent" : "var(--phosphor-12)",
              color: mode.disabled ? "var(--text-low)" : "var(--phosphor)",
              opacity: mode.disabled ? 0.5 : 1,
              border: mode.disabled
                ? "1px solid transparent"
                : "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              font: "600 11px/1 var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {mode.label}
          </button>
        );
        if (!mode.disabled) return segment;
        return (
          <Tooltip key={mode.value} label="coming in M2" tabIndex={0} className="cursor-not-allowed">
            {segment}
          </Tooltip>
        );
      })}
    </div>
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
        <SearchModeControl />
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
        <Tooltip label="coming in M5" tabIndex={0} className="cursor-not-allowed">
          <button
            type="button"
            disabled
            className="pointer-events-none"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 30,
              padding: "0 12px",
              background: "var(--violet-12)",
              border: "1px solid color-mix(in srgb, var(--violet) 40%, transparent)",
              borderRadius: "var(--radius-control)",
              font: "600 11px/1 var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--violet)",
              opacity: 0.5,
              whiteSpace: "nowrap",
            }}
          >
            Match ≥
          </button>
        </Tooltip>
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
