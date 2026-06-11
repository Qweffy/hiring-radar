"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/** Single-value range slider with phosphor track and mono readout. */
export interface RangeSliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  /** Formats the readout, e.g. v => `$${v}k`. */
  format?: (v: number) => React.ReactNode;
}

const RANGE_CSS = `
.hr-range { --pct: 50%; }
.hr-range::-webkit-slider-runnable-track {
  height: 4px; border-radius: 2px;
  background: linear-gradient(90deg, var(--phosphor) 0 var(--pct), rgba(147,164,179,0.18) var(--pct) 100%);
}
.hr-range::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(147,164,179,0.18); }
.hr-range::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--phosphor); }
.hr-range::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; margin-top: -6px;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--bg-raised); border: 2px solid var(--phosphor);
  box-shadow: var(--glow-phosphor-sm);
}
.hr-range::-moz-range-thumb {
  width: 16px; height: 16px; border: 2px solid var(--phosphor); border-radius: 50%;
  background: var(--bg-raised); box-shadow: var(--glow-phosphor-sm);
}
.hr-range:focus-visible { outline: none; }
.hr-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px var(--phosphor-dim); }
`;

const defaultFormat = (v: number): React.ReactNode => v;

export function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  format = defaultFormat,
  disabled = false,
  className,
  style,
  id,
  ...rest
}: RangeSliderProps): React.JSX.Element {
  const reactId = React.useId();
  const sid = id ?? reactId;
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div
      className={cn("w-full", className)}
      style={{ opacity: disabled ? 0.5 : 1, ...style }}
    >
      <style href="hr-range" precedence="medium">
        {RANGE_CSS}
      </style>
      <div
        className="flex items-baseline justify-between"
        style={{ marginBottom: 8 }}
      >
        {label && (
          <label
            htmlFor={sid}
            style={{ font: "var(--text-xs)", color: "var(--text-body)" }}
          >
            {label}
          </label>
        )}
        <span style={{ font: "var(--mono-base)", color: "var(--phosphor)" }}>
          {format(value)}
        </span>
      </div>
      <input
        id={sid}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="hr-range"
        style={
          {
            width: "100%",
            height: 24,
            appearance: "none",
            WebkitAppearance: "none",
            background: "transparent",
            cursor: disabled ? "not-allowed" : "pointer",
            "--pct": `${pct}%`,
          } as React.CSSProperties
        }
        {...rest}
      />
    </div>
  );
}
