import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONES = {
  neutral: { color: 'var(--text-mid)', border: 'var(--border)', bg: 'transparent' },
  phosphor: { color: 'var(--phosphor)', border: 'var(--border-strong)', bg: 'var(--phosphor-08)' },
  cyan: { color: 'var(--cyan)', border: 'rgba(76,201,240,0.35)', bg: 'var(--cyan-12)' },
  violet: { color: 'var(--violet)', border: 'rgba(167,139,250,0.40)', bg: 'var(--violet-12)' },
  amber: { color: 'var(--amber)', border: 'rgba(255,200,87,0.38)', bg: 'var(--amber-14)' },
};

/**
 * Tag — mono outline chip for stack tags and removable filter chips.
 * Numeric/code content stays mono (it always is here).
 */
export function Tag({ children, tone = 'neutral', icon, onRemove, selected = false, style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 8px',
        font: 'var(--mono-sm)', color: t.color,
        background: selected ? t.bg : (tone === 'neutral' ? 'transparent' : t.bg),
        border: `1px solid ${t.border}`, borderRadius: 'var(--radius-sm)',
        letterSpacing: '0.02em', whiteSpace: 'nowrap', ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={13} strokeWidth={1.75} />}
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove"
          style={{ display: 'inline-flex', marginRight: -3, padding: 1, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}
        >
          <Icon name="close" size={12} strokeWidth={2} />
        </button>
      )}
    </span>
  );
}
