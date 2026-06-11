import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * Input — text field. Supports leading icon, error state, and mono mode for data entry.
 */
export function Input({
  value, onChange, placeholder, type = 'text', icon, error, disabled = false,
  mono = false, size = 'md', style, id, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-h-sm)' : size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h)';
  const borderColor = error ? 'var(--red)' : focus ? 'var(--border-strong)' : 'var(--border)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', ...style }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: h,
          padding: '0 12px', background: 'var(--bg-surface)',
          border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-control)',
          boxShadow: error ? 'var(--glow-red)' : focus ? 'var(--glow-phosphor-sm)' : 'none',
          opacity: disabled ? 0.45 : 1,
          transition: 'border-color var(--dur-fast), box-shadow var(--dur)',
        }}
      >
        {icon && <Icon name={icon} size={16} style={{ color: 'var(--text-low-content)' }} />}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-hi)',
            font: mono ? 'var(--mono-base)' : 'var(--text-base)',
            letterSpacing: mono ? '0' : 'normal',
          }}
          {...rest}
        />
      </div>
      {error && typeof error === 'string' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: 'var(--text-xs)', color: 'var(--red)' }}>
          <Icon name="alert-triangle" size={13} strokeWidth={1.75} />{error}
        </span>
      )}
    </div>
  );
}
