import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * SegmentedControl — mono toggle between 2-4 modes (e.g. search mode: SEMANTIC / KEYWORD / HYBRID).
 * Options: array of { value, label, icon? }.
 */
export function SegmentedControl({ options, value, onChange, size = 'md', style, ...rest }) {
  const h = size === 'sm' ? 28 : 34;
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex', padding: 3, gap: 2, height: h,
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-control)', ...style,
      }}
      {...rest}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange && onChange(opt.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', height: '100%',
              background: selected ? 'var(--phosphor-12)' : 'transparent',
              color: selected ? 'var(--phosphor)' : 'var(--text-mid)',
              border: selected ? '1px solid var(--border-strong)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              font: '600 11px/1 var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'background var(--dur-fast), color var(--dur-fast)',
            }}
          >
            {opt.icon && <Icon name={opt.icon} size={14} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
