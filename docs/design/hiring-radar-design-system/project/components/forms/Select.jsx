import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Select — styled native dropdown with phosphor focus and chevron. */
export function Select({ value, onChange, children, disabled = false, error = false, size = 'md', style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-h-sm)' : size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h)';
  const borderColor = error ? 'var(--red)' : focus ? 'var(--border-strong)' : 'var(--border)';
  return (
    <div
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', height: h, width: '100%',
        background: 'var(--bg-surface)', border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-control)',
        boxShadow: focus ? 'var(--glow-phosphor-sm)' : 'none', opacity: disabled ? 0.45 : 1,
        transition: 'border-color var(--dur-fast), box-shadow var(--dur)', ...style,
      }}
    >
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          appearance: 'none', WebkitAppearance: 'none', flex: 1, height: '100%',
          padding: '0 34px 0 12px', background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--text-hi)', font: 'var(--text-base)', cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        {...rest}
      >
        {children}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, color: 'var(--text-low-content)', pointerEvents: 'none' }} />
    </div>
  );
}
