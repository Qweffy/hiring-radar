"use client";

import type { CSSProperties, ReactNode } from "react";
import type { BrowseFilters } from "@/lib/browse-params";
import type { PostingRow } from "@/lib/queries/postings";
import { formatSalary, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tag } from "@/components/ui/tag";

export interface PostingTableProps {
  rows: PostingRow[];
  page: number;
  pageSize: number;
  total: number;
  month: string | null;
  cursor: number;
  selectedHnId: number | null;
  isPending: boolean;
  hasActiveFilters: boolean;
  filters: BrowseFilters;
  now: number;
  onOpen: (hnId: number, index: number) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}

// Company | Role | Location | Salary | Stack | Posted | peek-chevron
const GRID_TEMPLATE = "200px minmax(0,1fr) 168px 124px 234px 78px 26px";
const MAX_STACK_TAGS = 4;

const HEADER_LABELS: { label: string; align?: "right" }[] = [
  { label: "Company" },
  { label: "Role" },
  { label: "Location" },
  { label: "Salary", align: "right" },
  { label: "Stack" },
  { label: "Posted" },
];

/** Plain-language hint naming the loudest active filter. */
function filterHint(filters: BrowseFilters): ReactNode {
  const monoName = (name: string) => (
    <span style={{ font: "var(--mono-sm)", color: "var(--text-hi)" }}>{name}</span>
  );
  if (filters.stack.length > 0) {
    return <>Try removing the {monoName(filters.stack[0])} filter.</>;
  }
  if (filters.salaryMin !== null) {
    return <>Try lowering the salary floor.</>;
  }
  if (filters.q.length > 0) {
    return <>Try a broader query than {monoName(`“${filters.q}”`)}.</>;
  }
  if (filters.visa) {
    return <>Try removing the {monoName("visa")} filter.</>;
  }
  if (filters.remote.length > 0) {
    return <>Try widening the remote filter.</>;
  }
  return <>Try a different month.</>;
}

function PaginationFooter({
  page,
  pageSize,
  total,
  isPending,
  onPageChange,
}: Pick<PostingTableProps, "page" | "pageSize" | "total" | "isPending" | "onPageChange">) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = page > 1;
  const hasNext = to < total;

  const pagerStyle = (enabled: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 30,
    padding: "0 12px",
    background: "transparent",
    border: `1px solid ${enabled ? "var(--border-strong)" : "var(--border)"}`,
    borderRadius: "var(--radius-control)",
    font: "var(--mono-sm)",
    color: enabled ? "var(--text-hi)" : "var(--text-low)",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.5,
  });

  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "14px 24px" }}
    >
      <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center" style={{ gap: 8 }}>
        <button
          type="button"
          disabled={!hasPrev || isPending}
          onClick={() => onPageChange(page - 1)}
          className={hasPrev ? "enabled:hover:bg-[var(--phosphor-08)]" : undefined}
          style={pagerStyle(hasPrev)}
        >
          <Icon name="chevron-left" size={13} />
          Prev
        </button>
        <button
          type="button"
          disabled={!hasNext || isPending}
          onClick={() => onPageChange(page + 1)}
          className={hasNext ? "enabled:hover:bg-[var(--phosphor-08)]" : undefined}
          style={pagerStyle(hasNext)}
        >
          Next
          <Icon name="chevron-right" size={13} />
        </button>
      </div>
    </div>
  );
}

export function PostingTable({
  rows,
  page,
  pageSize,
  total,
  month,
  cursor,
  selectedHnId,
  isPending,
  hasActiveFilters,
  filters,
  now,
  onOpen,
  onPageChange,
  onClearFilters,
}: PostingTableProps) {
  const nowDate = new Date(now);

  // ── State: no data ingested at all ────────────────────────────────────────
  if (total === 0 && !hasActiveFilters) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        <EmptyState
          illustration={<HRIllustration name="empty-radar" size={104} />}
          title="No postings on the scope yet"
          description={
            <>
              Ingest a &ldquo;Who is hiring?&rdquo; thread to fill the index.
              <code
                className="block"
                style={{
                  marginTop: 12,
                  padding: "8px 14px",
                  font: "var(--mono-sm)",
                  color: "var(--phosphor)",
                  background: "var(--bg-void)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                npm run ingest
              </code>
            </>
          }
        />
      </div>
    );
  }

  // ── State: filters narrowed to zero ───────────────────────────────────────
  if (total === 0) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto text-center"
        style={{ padding: 32, minHeight: 300 }}
      >
        <span className="hr-label" style={{ marginBottom: 14 }}>
          Nothing on this frequency
        </span>
        <HRIllustration name="empty-radar" size={104} />
        <h3
          style={{
            margin: "14px 0 6px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 18,
            color: "var(--text-hi)",
          }}
        >
          No postings match this scan
        </h3>
        <p
          className="m-0"
          style={{
            maxWidth: 340,
            font: "var(--text-sm)",
            color: "var(--text-mid)",
            marginBottom: 18,
          }}
        >
          {filterHint(filters)}
        </p>
        <Button variant="secondary" iconLeft="filter" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  // ── The dense table ───────────────────────────────────────────────────────
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div role="grid" aria-label={`Postings${month !== null ? ` for ${month}` : ""}`}>
        {/* Sticky header row */}
        <div
          role="row"
          className="sticky top-0 grid items-center"
          style={{
            gridTemplateColumns: GRID_TEMPLATE,
            gap: 12,
            padding: "10px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface)",
            zIndex: 5,
          }}
        >
          {HEADER_LABELS.map((col) => (
            <span
              key={col.label}
              role="columnheader"
              className="hr-label"
              style={col.align === "right" ? { textAlign: "right" } : undefined}
            >
              {col.label}
            </span>
          ))}
          <span role="columnheader" aria-label="Open" />
        </div>

        {/* Data rows — dim to 60% while re-querying, never blank */}
        <div
          role="rowgroup"
          style={{
            opacity: isPending ? 0.6 : 1,
            transition: "opacity var(--dur-fast)",
          }}
        >
          {rows.map((row, index) => {
            const isSelected = row.hnId === selectedHnId || index === cursor;
            const salary = formatSalary(row.salaryMin, row.salaryMax, row.salaryCurrency);
            const hiddenTags = row.stackTags.length - MAX_STACK_TAGS;
            return (
              <div
                key={row.hnId}
                role="row"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => onOpen(row.hnId, index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(row.hnId, index);
                  }
                }}
                className="group grid cursor-pointer items-center hover:bg-[var(--phosphor-08)] hover:shadow-[inset_0_0_0_1px_var(--phosphor-dim)]"
                style={{
                  gridTemplateColumns: GRID_TEMPLATE,
                  gap: 12,
                  padding: "12px 24px",
                  borderBottom: "1px solid var(--divider)",
                  borderLeft: `2px solid ${isSelected ? "var(--phosphor)" : "transparent"}`,
                  background: isSelected ? "var(--phosphor-08)" : "transparent",
                  boxShadow: isSelected
                    ? "inset 0 0 0 1px var(--phosphor-dim)"
                    : undefined,
                  transition:
                    "background var(--dur-fast), box-shadow var(--dur-fast), border-color var(--dur-fast)",
                }}
              >
                {/* Company */}
                <span role="gridcell" className="flex min-w-0 items-center" style={{ gap: 8 }}>
                  <span
                    className="truncate"
                    style={{
                      font: "600 14px/1.3 var(--font-ui)",
                      color: row.company !== null ? "var(--text-hi)" : "var(--text-low)",
                    }}
                  >
                    {row.company ?? "—"}
                  </span>
                  {row.isNew ? <StatusBadge status="NEW" className="shrink-0" /> : null}
                </span>

                {/* Role — raw first line + amber dot when unparsed */}
                <span role="gridcell" className="flex min-w-0 items-center" style={{ gap: 7 }}>
                  {row.role !== null ? (
                    <span
                      className="truncate"
                      style={{ font: "var(--text-sm)", color: "var(--text-mid)" }}
                    >
                      {row.role}
                    </span>
                  ) : (
                    <>
                      <span
                        title="Not parsed — showing the raw posting text"
                        className="shrink-0"
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "var(--amber)",
                          boxShadow:
                            "0 0 6px color-mix(in srgb, var(--amber) 60%, transparent)",
                        }}
                      />
                      <span
                        className="truncate"
                        style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}
                      >
                        {row.rawTextPreview}
                      </span>
                    </>
                  )}
                </span>

                {/* Location */}
                <span role="gridcell" className="flex min-w-0 items-center" style={{ gap: 7 }}>
                  {row.remotePolicy !== null ? (
                    <StatusBadge status={row.remotePolicy.toUpperCase()} className="shrink-0" />
                  ) : null}
                  {row.location !== null ? (
                    <span
                      className="truncate"
                      style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}
                    >
                      {row.location}
                    </span>
                  ) : row.remotePolicy === null ? (
                    <span style={{ font: "var(--mono-sm)", color: "var(--text-low)" }}>—</span>
                  ) : null}
                </span>

                {/* Salary — mono, right-aligned */}
                <span
                  role="gridcell"
                  className="whitespace-nowrap text-right"
                  style={{
                    font: "var(--mono-base)",
                    color: salary === "—" ? "var(--text-low)" : "var(--text-hi)",
                  }}
                >
                  {salary}
                </span>

                {/* Stack — 4 tags + overflow count */}
                <span
                  role="gridcell"
                  className="flex min-w-0 items-center overflow-hidden"
                  style={{ gap: 6 }}
                >
                  {row.stackTags.slice(0, MAX_STACK_TAGS).map((tag) => (
                    <Tag key={tag} className="shrink-0">
                      {tag}
                    </Tag>
                  ))}
                  {hiddenTags > 0 ? (
                    <span
                      className="shrink-0"
                      style={{ font: "var(--mono-sm)", color: "var(--text-low)" }}
                    >
                      +{hiddenTags}
                    </span>
                  ) : null}
                </span>

                {/* Posted */}
                <span
                  role="gridcell"
                  className="whitespace-nowrap"
                  style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}
                >
                  {relativeTime(row.hnCreatedAt, nowDate)}
                </span>

                {/* Peek chevron */}
                <span role="gridcell" className="flex justify-center">
                  <Icon
                    name="chevron-right"
                    size={16}
                    className="group-hover:opacity-100"
                    style={{
                      color: isSelected ? "var(--phosphor)" : "var(--text-low)",
                      opacity: isSelected ? 1 : 0.35,
                      transition: "opacity var(--dur-fast)",
                    }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={total}
        isPending={isPending}
        onPageChange={onPageChange}
      />
    </div>
  );
}
