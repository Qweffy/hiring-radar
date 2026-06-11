"use client";

import * as React from "react";

/** On/off switch. Phosphor track + glowing knob when on. */
export interface ToggleProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Optional trailing label. */
  label?: React.ReactNode;
  id?: string;
  style?: React.CSSProperties;
}

const TOGGLE_CSS = `
.hr-toggle-track {
  transition: background var(--dur), border-color var(--dur);
}
.hr-toggle-knob {
  transition: left var(--dur) var(--ease-out), background var(--dur);
}
@media (prefers-reduced-motion: reduce) {
  .hr-toggle-track, .hr-toggle-knob { transition: none; }
}
`;

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  style,
}: ToggleProps): React.JSX.Element {
  const reactId = React.useId();
  const sid = id ?? reactId;
  return (
    <label
      htmlFor={sid}
      className="inline-flex items-center"
      style={{
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <style href="hr-toggle" precedence="medium">
        {TOGGLE_CSS}
      </style>
      <button
        id={sid}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          if (!disabled && onChange) onChange(!checked);
        }}
        className="hr-toggle-track relative shrink-0"
        style={{
          width: 38,
          height: 22,
          padding: 0,
          background: checked ? "var(--phosphor-12)" : "rgba(147,164,179,0.12)",
          border: `1px solid ${checked ? "var(--border-strong)" : "var(--border)"}`,
          borderRadius: "var(--radius-card)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span
          className="hr-toggle-knob absolute"
          style={{
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: checked ? "var(--phosphor)" : "var(--text-low-content)",
            boxShadow: checked ? "var(--glow-phosphor-sm)" : "none",
          }}
        />
      </button>
      {label && (
        <span style={{ font: "var(--text-base)", color: "var(--text-body)" }}>
          {label}
        </span>
      )}
    </label>
  );
}
