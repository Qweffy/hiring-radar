import React from 'react';

/** Toggle — on/off switch. Phosphor when on, glow on the knob. */
export function Toggle({ checked, onChange, disabled = false, label, id, style, ...rest }) {
  const sid = id || React.useId();
  return (
    <label
      htmlFor={sid}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style,
      }}
    >
      <button
        id={sid}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          position: 'relative', width: 38, height: 22, padding: 0, flexShrink: 0,
          background: checked ? 'var(--phosphor-12)' : 'rgba(147,164,179,0.12)',
          border: `1px solid ${checked ? 'var(--border-strong)' : 'var(--border)'}`,
          borderRadius: 999, cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background var(--dur), border-color var(--dur)',
        }}
        {...rest}
      >
        <span
          style={{
            position: 'absolute', top: 2, left: checked ? 18 : 2,
            width: 16, height: 16, borderRadius: '50%',
            background: checked ? 'var(--phosphor)' : 'var(--text-low-content)',
            boxShadow: checked ? 'var(--glow-phosphor-sm)' : 'none',
            transition: 'left var(--dur) var(--ease-out), background var(--dur)',
          }}
        />
      </button>
      {label && <span style={{ font: 'var(--text-base)', color: 'var(--text-body)' }}>{label}</span>}
    </label>
  );
}
