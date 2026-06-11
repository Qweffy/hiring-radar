import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONES = {
  amber: { c: 'var(--amber)', bg: 'var(--amber-14)', b: 'rgba(255,200,87,0.30)', icon: 'alert-triangle' },
  violet: { c: 'var(--violet)', bg: 'var(--violet-12)', b: 'rgba(167,139,250,0.30)', icon: 'bot' },
  red: { c: 'var(--red)', bg: 'var(--red-14)', b: 'rgba(255,93,93,0.30)', icon: 'x-circle' },
};

/**
 * Banner — full-width strip under the topbar. Tones: amber (warning/stale),
 * violet (AI degraded), red (failure). Optional action slot.
 */
export function Banner({ tone = 'amber', children, action, onAction, actionLabel, onClose, style, ...rest }) {
  const t = TONES[tone] || TONES.amber;
  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px',
        background: t.bg, borderTop: `1px solid ${t.b}`, borderBottom: `1px solid ${t.b}`,
        ...style,
      }}
      {...rest}
    >
      <Icon name={t.icon} size={16} style={{ color: t.c, flexShrink: 0 }} />
      <span style={{ flex: 1, font: 'var(--text-sm)', color: 'var(--text-hi)' }}>{children}</span>
      {action && (
        <button onClick={onAction} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${t.b}`, borderRadius: 'var(--radius-sm)', padding: '5px 10px', cursor: 'pointer', font: '600 12px/1 var(--font-ui)', color: t.c }}>
          {actionLabel || 'Resolve'}
        </button>
      )}
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: t.c, opacity: 0.7 }}>
          <Icon name="close" size={15} />
        </button>
      )}
    </div>
  );
}
