import  { type CSSProperties } from "react";

import  {
  type ShortlistItem,
  type ShortlistStage,
} from "@/lib/queries/shortlist";


export type TabId = ShortlistStage | "all";

export interface TabDef {
  id: TabId;
  label: string;
  count: number;
}

export const TAB_DEFS: readonly { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "archived", label: "Archived" },
] as const;

export const STAGE_OPTIONS: readonly {
  value: ShortlistStage;
  label: string;
}[] = [
  { value: "new", label: "New" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "archived", label: "Archived" },
] as const;

interface StageMeta {
  /** Stripe + select text color. */
  color: string;
  /** Card border + select border tint. */
  tint: string;
  label: string;
}

const STAGE_META: Record<ShortlistStage, StageMeta> = {
  new: { color: "var(--violet)", tint: "rgba(167,139,250,0.30)", label: "New" },
  applied: { color: "var(--cyan)", tint: "rgba(76,201,240,0.30)", label: "Applied" },
  interviewing: {
    color: "var(--amber)",
    tint: "rgba(255,200,87,0.30)",
    label: "Interviewing",
  },
  offer: {
    color: "var(--phosphor)",
    tint: "rgba(61,255,162,0.30)",
    label: "Offer",
  },
  archived: { color: "var(--text-low)", tint: "var(--border)", label: "Archived" },
};

/** Stage tints/colors that drive the card stripe, border, and select. */
export function stageMeta(stage: ShortlistStage): StageMeta {
  return STAGE_META[stage];
}

/** Gauge dashoffset for a match score. Circumference 150.8 = 2π·24. */
export function gaugeOffset(match: number, circumference = 150.8): string {
  const clamped = Math.max(0, Math.min(100, match));
  return (circumference * (1 - clamped / 100)).toFixed(1);
}

/** "MM-DD HH:MM" in UTC — hydration-stable timestamp for note rows. */
export function formatNoteTs(date: Date): string {
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${min}`;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/** "$160k–$195k" style salary, mono + phosphor on the card. Null when unknown. */
export function formatSalary(item: ShortlistItem): string | null {
  const { salaryMin, salaryMax, salaryCurrency } = item;
  if (salaryMin === null && salaryMax === null) return null;
  const symbol = salaryCurrency ? (CURRENCY_SYMBOL[salaryCurrency] ?? "") : "";
  const k = (n: number): string => `${symbol}${Math.round(n / 1000)}k`;
  if (salaryMin !== null && salaryMax !== null) {
    return `${k(salaryMin)}–${k(salaryMax)}`;
  }
  const single = salaryMin ?? salaryMax;
  return single !== null ? k(single) : null;
}

/**
 * The agent's WHY line. Agent picks carry assessment reasons; we surface the
 * strongest fit ('+'), falling back to the first friction ('-') so a low-match
 * pick still explains its score. Manual entries (no reasons) return null and the
 * center column renders empty.
 */
export function whyLine(item: ShortlistItem): string | null {
  if (item.source !== "agent") return null;
  const reasons = item.matchReasons;
  if (!reasons || reasons.length === 0) return null;
  const fit = reasons.find((r) => r.sign === "+");
  const chosen = fit ?? reasons[0];
  return chosen?.text ?? null;
}

/** "AGENT PICK #23" or "MANUAL" for the source badge. */
export function badgeLabel(item: ShortlistItem): string {
  if (item.source === "agent") {
    return item.runId !== null ? `AGENT PICK #${item.runId}` : "AGENT PICK";
  }
  return "MANUAL";
}

const BADGE_BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  height: 20,
  padding: "0 8px",
  font: "600 10px/1 var(--font-mono)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  borderRadius: "var(--radius-sm)",
  whiteSpace: "nowrap",
};

/** Source-badge style: agent = violet fill, manual = phosphor outline. */
export function badgeStyle(item: ShortlistItem): CSSProperties {
  if (item.source === "agent") {
    return {
      ...BADGE_BASE,
      color: "var(--violet)",
      background: "var(--violet-12)",
      border: "1px solid rgba(167,139,250,0.4)",
    };
  }
  return {
    ...BADGE_BASE,
    color: "var(--phosphor)",
    background: "transparent",
    border: "1px solid var(--border-strong)",
  };
}

/** External HN thread link for the "Open on HN" menu item. */
export function hnUrl(hnId: number): string {
  return `https://news.ycombinator.com/item?id=${hnId}`;
}

/** Card container style — stage-tinted border, left accent stripe, dimmed when archived. */
export function cardStyle(stage: ShortlistStage): CSSProperties {
  const meta = stageMeta(stage);
  return {
    background: "var(--bg-raised)",
    border: `1px solid ${meta.tint}`,
    borderLeft: `3px solid ${meta.color}`,
    borderRadius: "var(--radius-card)",
    boxShadow: "var(--shadow-card)",
    opacity: stage === "archived" ? 0.55 : 1,
    overflow: "hidden",
    transition:
      "border-color var(--dur) var(--ease-out), opacity var(--dur) var(--ease-out)",
  };
}

/** Stage-<select> style — border + text tinted by the current stage. */
export function selectStyle(stage: ShortlistStage): CSSProperties {
  const meta = stageMeta(stage);
  return {
    height: 30,
    padding: "0 8px",
    borderRadius: "var(--radius-control)",
    font: "600 11px/1 var(--font-mono)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    background: "var(--bg-surface)",
    color: meta.color,
    border: `1px solid ${meta.tint}`,
    cursor: "pointer",
    appearance: "auto",
  };
}

export interface ShortlistTabsResult {
  tabs: TabDef[];
  trackedCount: number;
}

/**
 * Per-stage tab counts over the live (non-removed) entries, plus the grand
 * total used by the "{N} TRACKED" header. Counts are pure functions of the
 * server data — no phantom offset (the mock's +2 modeled roles tracked
 * elsewhere; production reflects real rows).
 */
export function deriveTabs(items: ShortlistItem[]): ShortlistTabsResult {
  const counts: Record<ShortlistStage, number> = {
    new: 0,
    applied: 0,
    interviewing: 0,
    offer: 0,
    archived: 0,
  };
  for (const item of items) {
    counts[item.stage] += 1;
  }
  const all = items.length;
  const tabs: TabDef[] = TAB_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    count: def.id === "all" ? all : counts[def.id],
  }));
  return { tabs, trackedCount: all };
}

/** Label of the active tab — used in the filtered-empty copy. */
export function activeTabLabel(tab: TabId): string {
  return TAB_DEFS.find((t) => t.id === tab)?.label ?? "All";
}
