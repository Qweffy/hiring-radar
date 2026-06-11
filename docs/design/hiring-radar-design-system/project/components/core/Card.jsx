import React from 'react';

/**
 * Card — base surface/panel. variant: raised (default) | glass | flush.
 * Optional header (label + actions) and padding control.
 */
export function Card({ variant = 'raised', header, actions, children, glow = false, padding = true, style, ...rest }) {
  const surfaces = {
    raised: { background: 'var(--bg-raised)', border: '1px solid var(--border)', backdropFilter: 'none' },
    glass: { background: 'var(--glass)', border: '1px solid var(--border)', backdropFilter: 'blur(var(--blur-glass))', WebkitBackdropFilter: 'blur(var(--blur-glass))' },
    flush: { background: 'var(--bg-surface)', border: '1px solid var(--border)', backdropFilter: 'none' },
  };
  const s = surfaces[variant] || surfaces.raised;
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        borderRadius: 'var(--radius-card)', boxShadow: glow ? 'var(--glow-phosphor-sm), var(--shadow-card)' : 'var(--shadow-card)',
        overflow: 'hidden', ...s, ...style,
      }}
      {...rest}
    >
      {header && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--divider)' }}>
          <span style={{ font: 'var(--label-mono)', letterSpacing: 'var(--label-tracking)', textTransform: 'uppercase', color: 'var(--text-label)' }}>{header}</span>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: padding ? 'var(--pad-panel)' : 0, flex: 1 }}>{children}</div>
    </div>
  );
}
