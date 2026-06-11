import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * SearchInput — the primary scan field. Mono placeholder, ⌘K hint, optional clear.
 */
export function SearchInput({
  value, onChange, placeholder = 'scan postings…', hint = '⌘K',
  onClear, autoFocus, size = 'md', style, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h)';
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, height: h, width: '100%',
        padding: '0 10px 0 12px', background: 'var(--bg-surface)',
        border: `1px solid ${focus ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-control)',
        boxShadow: focus ? 'var(--glow-phosphor-sm)' : 'none',
        transition: 'border-color var(--dur-fast), box-shadow var(--dur)',
        ...style,
      }}
    >
      <Icon name="search" size={16} style={{ color: focus ? 'var(--phosphor)' : 'var(--text-low-content)' }} />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--text-hi)', font: 'var(--mono-base)',
        }}
        {...rest}
      />
      {value && onClear
        ? (
          <button onClick={onClear} aria-label="Clear" style={{ display: 'inline-flex', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-low-content)' }}>
            <Icon name="close" size={14} />
          </button>
        )
        : hint && (
          <kbd style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-low-content)', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 6px' }}>{hint}</kbd>
        )}
    </div>
  );
}
