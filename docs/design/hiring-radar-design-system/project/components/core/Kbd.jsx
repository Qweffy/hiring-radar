import React from 'react';

/** Kbd — a single keycap, mono. Combine for chords: <Kbd>⌘</Kbd><Kbd>K</Kbd>. */
export function Kbd({ children, style, ...rest }) {
  return (
    <kbd
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 20, height: 20, padding: '0 6px',
        font: '600 11px/1 var(--font-mono)', color: 'var(--text-mid)',
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </kbd>
  );
}
