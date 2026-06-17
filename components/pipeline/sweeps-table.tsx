"use client";

import { ArrowRight } from "lucide-react";
import { Fragment } from "react";
import  { type CSSProperties } from "react";

import  { type SweepView } from "@/components/pipeline/types";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";


const HN_ITEM_URL = (threadId: number) =>
  `https://news.ycombinator.com/item?id=${threadId}`;

/** Shared grid template for the header row and every data row. */
const ROW_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(120px,1.2fr) 84px 84px 54px 50px 64px 64px 116px 24px",
  gap: 10,
  alignItems: "center",
};

const headerCell: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

const monoSm: CSSProperties = { font: "var(--mono-sm)" };
const right: CSSProperties = { textAlign: "right" };

const triggerChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  height: 20,
  padding: "0 7px",
  font: "600 10px/1 var(--font-mono)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-mid)",
  border: "1px solid var(--border)",
  whiteSpace: "nowrap",
};

interface SweepRowItemProps {
  sweep: SweepView;
  open: boolean;
  onToggle: () => void;
}

function StepBreakdown({ sweep }: { sweep: SweepView }) {
  return (
    <div
      style={{
        padding: "14px 18px 16px 18px",
        background: "var(--bg-void)",
        borderBottom: "1px solid var(--divider)",
      }}
    >
      <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
        <span
          style={{
            font: "var(--label-mono)",
            letterSpacing: "var(--label-tracking)",
            textTransform: "uppercase",
            color: "var(--text-low)",
          }}
        >
          Step breakdown
        </span>
        <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
          thread {sweep.threadId} · fetched {sweep.fetchedCount} · changed{" "}
          {sweep.changedCount}
        </span>
      </div>

      <div className="flex items-stretch" style={{ gap: 0 }}>
        {sweep.steps.map((st, index) => {
          const accent = st.warn ? "var(--amber)" : "var(--phosphor)";
          const last = index === sweep.steps.length - 1;
          return (
            <Fragment key={st.name}>
              <div className="flex flex-1 items-center">
                <div
                  className="flex-1"
                  style={{
                    padding: "12px 14px",
                    background: "var(--bg-raised)",
                    border: `1px solid ${
                      st.warn ? "color-mix(in srgb, var(--amber) 32%, transparent)" : "var(--border)"
                    }`,
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <div
                    className="flex items-center"
                    style={{ gap: 7, marginBottom: 7 }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: accent,
                        boxShadow: `0 0 6px ${accent}`,
                      }}
                    />
                    <span style={{ font: "var(--mono-base)", color: "var(--text-hi)" }}>
                      {st.name}
                    </span>
                  </div>
                  <div style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>
                    {st.count.toLocaleString("en-US")} items
                  </div>
                  <div
                    style={{
                      font: "var(--mono-sm)",
                      marginTop: 3,
                      color: st.warn ? "var(--amber)" : "var(--text-low)",
                    }}
                  >
                    {st.note}
                  </div>
                </div>
              </div>
              {!last && (
                <div className="flex items-center" style={{ margin: "0 2px" }}>
                  <ArrowRight
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    style={{ color: "var(--text-low)", flexShrink: 0 }}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function SweepRowItem({ sweep, open, onToggle }: SweepRowItemProps) {
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className="hr-sweep-row cursor-pointer"
        style={{
          ...ROW_GRID,
          padding: "13px 18px",
          borderBottom: "1px solid var(--divider)",
        }}
      >
        {/* 1 — Sweep month + external link */}
        <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
          <span
            style={{
              font: "600 13px/1.2 var(--font-ui)",
              color: "var(--text-hi)",
              whiteSpace: "nowrap",
            }}
          >
            {sweep.monthLabel}
          </span>
          <a
            href={HN_ITEM_URL(sweep.threadId)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open the ${sweep.monthLabel} Who is hiring thread`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex"
            style={{ color: "var(--cyan)", lineHeight: 0 }}
          >
            <Icon name="external-link" size={12} />
          </a>
        </div>

        {/* 2 — Trigger chip */}
        <span style={triggerChip}>{sweep.trigger}</span>

        {/* 3 — Started */}
        <span
          style={{ ...monoSm, color: "var(--text-low-content)", whiteSpace: "nowrap" }}
        >
          {sweep.started}
        </span>

        {/* 4 — Dur */}
        <span style={{ ...monoSm, color: "var(--text-mid)", ...right }}>
          {sweep.dur}
        </span>

        {/* 5 — New */}
        <span style={{ ...monoSm, color: "var(--phosphor)", ...right }}>
          {sweep.newCount}
        </span>

        {/* 6 — Re-emb */}
        <span style={{ ...monoSm, color: "var(--text-mid)", ...right }}>
          {sweep.reembCount}
        </span>

        {/* 7 — Failed */}
        <span
          style={{
            ...monoSm,
            color: sweep.failedCount > 0 ? "var(--red)" : "var(--text-low)",
            ...right,
          }}
        >
          {sweep.failedCount}
        </span>

        {/* 8 — Status */}
        <span>
          <StatusBadge status={sweep.status} />
        </span>

        {/* 9 — Caret */}
        <span className="flex items-center justify-end" style={{ lineHeight: 0 }}>
          <Icon
            name="chevron-down"
            size={14}
            style={{
              color: "var(--text-low-content)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform var(--dur-fast) var(--ease-out)",
            }}
          />
        </span>
      </div>

      {open && <StepBreakdown sweep={sweep} />}
    </>
  );
}

export interface SweepsTableProps {
  sweeps: SweepView[];
  expandedId: number | null;
  onToggle: (id: number) => void;
}

/** Sweeps card: header, column header, and the accordion of recent runs. */
export function SweepsTable({ sweeps, expandedId, onToggle }: SweepsTableProps) {
  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}
    >
      <style href="hr-sweep-row-hover" precedence="medium">
        {`.hr-sweep-row:hover{background:var(--phosphor-08)}
.hr-sweep-row:focus-visible{outline:2px solid var(--phosphor);outline-offset:-2px}`}
      </style>

      {/* Card header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "14px 18px", borderBottom: "1px solid var(--divider)" }}
      >
        <span
          style={{
            font: "var(--label-mono)",
            letterSpacing: "var(--label-tracking)",
            textTransform: "uppercase",
            color: "var(--text-low)",
          }}
        >
          Sweeps
        </span>
        <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
          last {sweeps.length}
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          ...ROW_GRID,
          padding: "9px 18px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={headerCell}>Sweep</span>
        <span style={headerCell}>Trigger</span>
        <span style={headerCell}>Started</span>
        <span style={{ ...headerCell, ...right }}>Dur</span>
        <span style={{ ...headerCell, ...right }}>New</span>
        <span style={{ ...headerCell, ...right }}>Re-emb</span>
        <span style={{ ...headerCell, ...right }}>Failed</span>
        <span style={headerCell}>Status</span>
        <span />
      </div>

      {/* Rows */}
      {sweeps.map((sweep) => (
        <SweepRowItem
          key={sweep.id}
          sweep={sweep}
          open={expandedId === sweep.id}
          onToggle={() => onToggle(sweep.id)}
        />
      ))}
    </div>
  );
}
