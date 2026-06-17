"use client";

import { useId, useMemo, useState } from "react";
import  { type CSSProperties } from "react";

import { Icon } from "@/components/ui/icon";
import { ScoreGauge } from "@/components/ui/score-gauge";
import  { type DashboardBlip } from "@/lib/queries/dashboard";
import {
  CATEGORIES,
  CATEGORY_ANGLE,
  CATEGORY_LABEL,
  CENTER,
  OUTER_RADIUS,
  SCOPE_SIZE,
  blipFillOpacity,
  matchToRadius,
  polarToCartesian,
  tierToDiameter,
  type Category,
} from "@/lib/radar";


/** Sweep beam keyframes — registered once, scoped via the precedence cache. */
const SWEEP_CSS = `
@keyframes hr-rotate { to { transform: rotate(360deg); } }
.hr-sweep { animation: hr-rotate 4s linear infinite; pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .hr-sweep { animation: none !important; }
}
`;

const SWEEP_CONIC =
  "conic-gradient(from 0deg, rgba(61,255,162,0.20) 0deg, rgba(61,255,162,0.05) 22deg, transparent 46deg, transparent 360deg)";

interface RimLabel { category: Category; x: number; y: number; text: string }

interface DegreeTick { x1: number; y1: number; x2: number; y2: number; major: boolean }

interface Spoke { x2: number; y2: number }

/** Positioned blip ready to render — derived once from the data layer. */
type PlacedBlip = DashboardBlip & {
  x: number;
  y: number;
  diameter: number;
};

const RING_RADII = [
  { r: 236, stroke: "var(--phosphor-dim)" },
  { r: 177, stroke: "var(--phosphor-dim)" },
  { r: 118, stroke: "var(--phosphor-dim)" },
  { r: 59, stroke: "rgba(61,255,162,0.22)" },
];

// The grid geometry is fixed (independent of data), so compute it once at
// module scope rather than re-deriving per render.
const TICKS: DegreeTick[] = Array.from({ length: 36 }, (_, i) => {
  const a = i * 10;
  const major = i % 9 === 0;
  const r2 = major ? 225 : 230;
  const p1 = polarToCartesian(OUTER_RADIUS, a);
  const p2 = polarToCartesian(r2, a);
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, major };
});

const RIM_LABELS: RimLabel[] = CATEGORIES.map((category) => {
  const { x, y } = polarToCartesian(264, CATEGORY_ANGLE[category]);
  return { category, x, y, text: CATEGORY_LABEL[category] };
});

const SPOKES: Spoke[] = CATEGORIES.map((category) => {
  const { x, y } = polarToCartesian(OUTER_RADIUS, CATEGORY_ANGLE[category]);
  return { x2: x, y2: y };
});

/** Distribute a cluster's blips across its angular spread, in data order. */
function placeBlips(blips: DashboardBlip[]): PlacedBlip[] {
  const byCategory = new Map<Category, DashboardBlip[]>();
  for (const blip of blips) {
    const list = byCategory.get(blip.category) ?? [];
    list.push(blip);
    byCategory.set(blip.category, list);
  }

  const placed: PlacedBlip[] = [];
  for (const category of CATEGORIES) {
    const cluster = byCategory.get(category) ?? [];
    const n = cluster.length;
    cluster.forEach((blip, i) => {
      const center = CATEGORY_ANGLE[category];
      const spread = category === "DevOps" || category === "Other" ? 18 : 26;
      const angle = center - spread + ((i + 0.5) / Math.max(1, n)) * 2 * spread;
      const radius = matchToRadius(blip.match);
      const { x, y } = polarToCartesian(radius, angle);
      placed.push({ ...blip, x, y, diameter: tierToDiameter(blip.tier) });
    });
  }
  return placed;
}

function tooltipPosition(blip: PlacedBlip): { left: number; top: number } {
  const left =
    blip.x > CENTER ? blip.x - 18 - 250 : blip.x + 18;
  const clampedLeft = Math.max(0, Math.min(310, left));
  const top = Math.max(0, Math.min(392, blip.y - 60));
  return { left: clampedLeft, top };
}

export interface RadarScopeProps {
  blips: DashboardBlip[];
  /** "JUN 2026" — the month label in the caption. */
  monthLabel: string;
  totalPostings: number;
  newCount: number;
}

/**
 * The radar scope: SVG rings/ticks/spokes, the rotating conic sweep (frozen
 * under reduced motion), category rim labels, data blips, a hover tooltip and
 * the legend/caption. Decorative for AT — the caption + the radar's aria-label
 * carry the summary; tooltip content is still reachable via blip focus.
 *
 * Blip distance encodes the agent's real match score when a posting has been
 * assessed (recency fallback otherwise); agent-shortlisted blips wear a violet
 * halo.
 */
export function RadarScope({
  blips,
  monthLabel,
  totalPostings,
  newCount,
}: RadarScopeProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [hovered, setHovered] = useState<number>(0);

  const placed = useMemo(() => placeBlips(blips), [blips]);

  const active = placed[hovered] ?? null;

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="uppercase"
          style={{
            font: "var(--label-mono)",
            letterSpacing: "var(--label-tracking)",
            color: "var(--text-low)",
          }}
        >
          Live scope
        </span>
        <span
          className="flex items-center"
          style={{ gap: 7, font: "var(--mono-sm)", color: "var(--phosphor)" }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--phosphor)",
              boxShadow: "0 0 8px var(--phosphor)",
            }}
          />
          Sweeping
        </span>
      </div>

      <div
        className="relative mx-auto"
        style={{ width: SCOPE_SIZE, height: SCOPE_SIZE, marginTop: 6 }}
        role="img"
        aria-label={`Radar scope: ${totalPostings} postings in ${monthLabel}, ${newCount} new this sweep, plotted by category and recency.`}
      >
        {/* Base grid */}
        <svg
          width={SCOPE_SIZE}
          height={SCOPE_SIZE}
          viewBox={`0 0 ${SCOPE_SIZE} ${SCOPE_SIZE}`}
          className="pointer-events-none absolute left-0 top-0"
          aria-hidden="true"
        >
          {RING_RADII.map((ring) => (
            <circle
              key={ring.r}
              cx={CENTER}
              cy={CENTER}
              r={ring.r}
              fill="none"
              stroke={ring.stroke}
              strokeWidth={1}
            />
          ))}
          <line x1={CENTER} y1={44} x2={CENTER} y2={516} stroke="rgba(61,255,162,0.07)" strokeWidth={1} />
          <line x1={44} y1={CENTER} x2={516} y2={CENTER} stroke="rgba(61,255,162,0.07)" strokeWidth={1} />
          {SPOKES.map((s, i) => (
            <line
              key={`spoke-${i}`}
              x1={CENTER}
              y1={CENTER}
              x2={s.x2}
              y2={s.y2}
              stroke="rgba(61,255,162,0.06)"
              strokeWidth={1}
            />
          ))}
          {TICKS.map((t, i) => (
            <line
              key={`tick-${i}`}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.major ? "rgba(61,255,162,0.4)" : "rgba(61,255,162,0.18)"}
              strokeWidth={t.major ? 1.5 : 1}
            />
          ))}
        </svg>

        {/* Rotating conic wedge */}
        <div
          className="hr-sweep absolute"
          aria-hidden="true"
          style={{
            left: 44,
            top: 44,
            width: 472,
            height: 472,
            borderRadius: "50%",
            background: SWEEP_CONIC,
          }}
        />
        {/* Leading edge line */}
        <div
          className="hr-sweep absolute"
          aria-hidden="true"
          style={{
            left: 280,
            top: 48,
            width: 1.5,
            height: 232,
            transformOrigin: "bottom center",
            background: "linear-gradient(to bottom, rgba(61,255,162,0.7), transparent)",
          }}
        />

        {/* Center pip */}
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            left: CENTER,
            top: CENTER,
            width: 8,
            height: 8,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "var(--phosphor)",
            boxShadow: "0 0 10px var(--phosphor)",
          }}
        />

        {/* Category rim labels */}
        {RIM_LABELS.map((label) => (
          <span
            key={label.category}
            aria-hidden="true"
            className="pointer-events-none absolute uppercase"
            style={{
              left: label.x,
              top: label.y,
              transform: "translate(-50%, -50%)",
              font: "600 11px/1 var(--font-mono)",
              letterSpacing: "0.12em",
              color: "var(--text-low-content)",
              whiteSpace: "nowrap",
            }}
          >
            {label.text}
          </span>
        ))}

        {/* Blips */}
        {placed.map((blip, i) => (
          <BlipDot
            key={`${blip.hnId}-${i}`}
            blip={blip}
            hovered={hovered === i}
            onHover={() => setHovered(i)}
          />
        ))}

        {/* Hover tooltip */}
        {active && <BlipTooltip blip={active} />}

        {/* Legend */}
        <div
          className="absolute"
          style={{
            left: 0,
            bottom: 0,
            padding: "10px 12px",
            background: "rgba(11,16,24,0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-control)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            className="uppercase"
            style={{
              font: "var(--label-mono)",
              letterSpacing: "var(--label-tracking)",
              color: "var(--text-low)",
            }}
          >
            Legend
          </span>
          <LegendRow>
            <span style={dotStyle(7)} />
            closer = stronger match
          </LegendRow>
          <LegendRow>
            <span className="inline-flex items-center" style={{ gap: 3 }}>
              <span style={dotStyle(5)} />
              <span style={dotStyle(9)} />
            </span>
            size = salary band
          </LegendRow>
          <LegendRow>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "transparent",
                boxShadow: "0 0 0 2px rgba(167,139,250,0.6)",
              }}
            />
            halo = agent-shortlisted
          </LegendRow>
        </div>

        <style href={`hr-radar-sweep-${uid}`} precedence="medium">
          {SWEEP_CSS}
        </style>
      </div>

      {/* Caption */}
      <div
        className="text-center"
        style={{
          marginTop: 14,
          font: "var(--mono-sm)",
          color: "var(--text-low-content)",
          letterSpacing: "0.06em",
        }}
      >
        {`SWEEP: ${monthLabel} · ${totalPostings} POSTINGS · `}
        <span style={{ color: "var(--phosphor)" }}>{`${newCount} NEW`}</span>
      </div>
    </div>
  );
}

function dotStyle(size: number): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    background: "var(--phosphor)",
    boxShadow: "0 0 6px rgba(61,255,162,0.5)",
    flexShrink: 0,
  };
}

function LegendRow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="flex items-center"
      style={{ gap: 8, font: "var(--mono-sm)", color: "var(--text-mid)" }}
    >
      {children}
    </span>
  );
}

function BlipDot({
  blip,
  hovered,
  onHover,
}: {
  blip: PlacedBlip;
  hovered: boolean;
  onHover: () => void;
}) {
  const fill = `rgba(61,255,162, ${blipFillOpacity(blip.match)})`;
  // A shortlisted blip wears a violet halo (an extra outer ring) at all times.
  const halo = blip.shortlisted ? ", 0 0 0 3px rgba(167,139,250,0.6)" : "";
  const resting = `0 0 6px rgba(61,255,162,0.45)${halo}`;
  const hover = `0 0 0 2px rgba(232,240,242,0.9), 0 0 14px rgba(61,255,162,0.7)${halo}`;

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onFocus={onHover}
      aria-label={`${blip.company} — ${blip.role}${blip.salaryLabel ? `, ${blip.salaryLabel}` : ""}${blip.shortlisted ? ", shortlisted" : ""}`}
      className="absolute flex cursor-pointer items-center justify-center border-0 bg-transparent p-0"
      style={{
        left: blip.x,
        top: blip.y,
        width: 20,
        height: 20,
        transform: "translate(-50%, -50%)",
        zIndex: hovered ? 30 : 10,
      }}
    >
      <span
        style={{
          width: blip.diameter,
          height: blip.diameter,
          borderRadius: "50%",
          background: fill,
          boxShadow: hovered ? hover : resting,
          transform: hovered ? "scale(1.25)" : "scale(1)",
          transition: "box-shadow 120ms, transform 120ms",
        }}
      />
    </button>
  );
}

function BlipTooltip({ blip }: { blip: PlacedBlip }) {
  const { left, top } = tooltipPosition(blip);
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left,
        top,
        width: 250,
        zIndex: 40,
        padding: 14,
        background: "var(--glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-pop), var(--glow-phosphor-sm)",
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: 14 }}>
        <div className="min-w-0">
          <div style={{ font: "600 13px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
            {blip.company}
          </div>
          <div style={{ font: "var(--text-xs)", color: "var(--text-mid)", marginTop: 2 }}>
            {blip.role}
          </div>
          {blip.salaryLabel && (
            <div style={{ font: "var(--mono-sm)", color: "var(--phosphor)", marginTop: 8 }}>
              {blip.salaryLabel}
            </div>
          )}
          {blip.region && (
            <div
              style={{ font: "var(--mono-sm)", color: "var(--text-low-content)", marginTop: 3 }}
            >
              {blip.region}
            </div>
          )}
        </div>
        <ScoreGauge score={blip.match} size={48} />
      </div>
      <div
        className="flex items-center justify-between"
        style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--divider)" }}
      >
        <span
          className="uppercase"
          style={{
            height: 20,
            padding: "0 7px",
            display: "inline-flex",
            alignItems: "center",
            font: "600 10px/1 var(--font-mono)",
            letterSpacing: "0.1em",
            color: "var(--text-mid)",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {blip.category === "AI-ML" ? "AI · ML" : blip.category}
        </span>
        <span
          className="flex items-center"
          style={{ gap: 4, font: "600 12px/1 var(--font-ui)", color: "var(--cyan)" }}
        >
          View
          <Icon name="arrow-right" size={13} style={{ color: "var(--cyan)" }} />
        </span>
      </div>
    </div>
  );
}
