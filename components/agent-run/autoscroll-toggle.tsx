import  { type CSSProperties } from "react";

/**
 * The "auto-scroll" switch in the trace header. A real switch
 * (role="switch" + aria-checked); ON pins the knob right with a phosphor glow,
 * OFF slides it left and greys the track. Matches Agent Run.dc.html.
 */
export interface AutoscrollToggleProps {
  on: boolean;
  onToggle: () => void;
}

const trackBase: CSSProperties = {
  position: "relative",
  width: 34,
  height: 18,
  borderRadius: 9,
  flexShrink: 0,
  transition: "background var(--dur-fast), border-color var(--dur-fast)",
};

const knobBase: CSSProperties = {
  position: "absolute",
  top: 1,
  width: 14,
  height: 14,
  borderRadius: "50%",
  background: "var(--phosphor)",
  transition: "left var(--dur) var(--ease-out), right var(--dur) var(--ease-out)",
};

export function AutoscrollToggle({ on, onToggle }: AutoscrollToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Auto-scroll the trace"
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        font: "var(--mono-sm)",
        color: "var(--text-low-content)",
      }}
    >
      auto-scroll
      <span
        style={{
          ...trackBase,
          background: on ? "var(--phosphor-12)" : "rgba(147,164,179,0.16)",
          border: `1px solid ${on ? "var(--border-strong)" : "var(--border)"}`,
        }}
      >
        <span
          style={{
            ...knobBase,
            left: on ? "auto" : 2,
            right: on ? 2 : "auto",
            background: on ? "var(--phosphor)" : "var(--text-low-content)",
            boxShadow: on ? "0 0 8px var(--phosphor)" : "none",
          }}
        />
      </span>
    </button>
  );
}
