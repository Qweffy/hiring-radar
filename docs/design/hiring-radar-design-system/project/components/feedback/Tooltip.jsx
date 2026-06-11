import React from 'react';

/**
 * Tooltip — mono, instant (no delay). Wraps a trigger; shows on hover/focus.
 * Positions: top | bottom | left | right.
 */
export function Tooltip({ label, position = 'top', children, style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const pos = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 },
  }[position];
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      {...rest}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', zIndex: 'var(--z-dropdown)', ...pos,
            padding: '5px 8px', whiteSpace: 'nowrap',
            font: 'var(--mono-sm)', color: 'var(--text-hi)',
            background: 'var(--bg-raised)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-pop)',
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
