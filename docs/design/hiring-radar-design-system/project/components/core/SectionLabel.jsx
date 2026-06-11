import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * SectionLabel — uppercase 11px mono terminal label for chrome headers.
 * e.g. "SIGNAL FEED", "LAST SWEEP 06:00 UTC".
 */
export function SectionLabel({ children, icon, tone = 'low', style, ...rest }) {
  const colors = { low: 'var(--text-label)', phosphor: 'var(--phosphor)', violet: 'var(--violet)', amber: 'var(--amber)' };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        font: 'var(--label-mono)', letterSpacing: 'var(--label-tracking)',
        textTransform: 'uppercase', color: colors[tone] || colors.low,
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={13} strokeWidth={1.75} />}
      {children}
    </span>
  );
}
