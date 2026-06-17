import  { type CSSProperties } from "react";

interface SectionHeaderProps {
  /** e.g. "01 · Signal source". */
  label: string;
  /** Label accent — phosphor for form sections, violet for the agent section. */
  color: string;
  /** Bottom margin (the design varies it 14/16px per section). @default 14 */
  marginBottom?: number;
}

/**
 * The numbered-divider section heading: a mono uppercase label and a trailing
 * hairline rule that fills the remaining width.
 */
export function SectionHeader({
  label,
  color,
  marginBottom = 14,
}: SectionHeaderProps) {
  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom,
  };
  return (
    <div style={rowStyle}>
      <span
        style={{
          font: "600 11px/1 var(--font-mono)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />
    </div>
  );
}
