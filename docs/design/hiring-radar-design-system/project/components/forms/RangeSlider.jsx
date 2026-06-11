import React from 'react';

/**
 * RangeSlider — single-value range (e.g. min salary). Phosphor track fill,
 * mono value readout. Value shown formatted via `format`.
 */
export function RangeSlider({
  value, onChange, min = 0, max = 100, step = 1,
  label, format = (v) => v, disabled = false, style, id, ...rest
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const sid = id || React.useId();
  return (
    <div style={{ width: '100%', opacity: disabled ? 0.5 : 1, ...style }}>
      {(label || format) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          {label && <label htmlFor={sid} style={{ font: 'var(--text-xs)', color: 'var(--text-body)' }}>{label}</label>}
          <span style={{ font: 'var(--mono-base)', color: 'var(--phosphor)' }}>{format(value)}</span>
        </div>
      )}
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
        style={{
          width: '100%', height: 24, appearance: 'none', WebkitAppearance: 'none',
          background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
          ['--pct']: pct + '%',
        }}
        {...rest}
      />
      <style>{`
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
      `}</style>
    </div>
  );
}
