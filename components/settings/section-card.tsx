import  { type CSSProperties, type ReactNode } from "react";

type SectionTone = "phosphor" | "violet";

const TONES: Record<SectionTone, string> = {
  phosphor: "var(--phosphor)",
  violet: "var(--violet)",
};

/**
 * One settings panel: a surface card with a mono uppercase header rule. Mirrors
 * the design's section blocks (Agent limits, Sweep schedule, MCP, Data,
 * Notifications). Tone colours the header label — violet for the AI/MCP block.
 */
export interface SectionCardProps {
  title: string;
  /** @default 'phosphor' */
  tone?: SectionTone;
  /** Optional sub-line under the header (MCP panel uses it). */
  subtitle?: ReactNode;
  children: ReactNode;
}

export function SectionCard({
  title,
  tone = "phosphor",
  subtitle,
  children,
}: SectionCardProps) {
  return (
    <section style={CARD}>
      <div style={{ ...HEADER_ROW, marginBottom: subtitle ? 6 : 18 }}>
        <span style={{ ...HEADER_LABEL, color: TONES[tone] }}>{title}</span>
        <div style={DIVIDER} />
      </div>
      {subtitle ? <p style={SUBTITLE}>{subtitle}</p> : null}
      {children}
    </section>
  );
}

const CARD: CSSProperties = {
  padding: 22,
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
};

const HEADER_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const HEADER_LABEL: CSSProperties = {
  font: "600 11px/1 var(--font-mono)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const DIVIDER: CSSProperties = {
  flex: 1,
  height: 1,
  background: "var(--divider)",
};

const SUBTITLE: CSSProperties = {
  margin: "0 0 18px",
  font: "var(--text-sm)",
  color: "var(--text-low-content)",
};
