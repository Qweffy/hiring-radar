import React from 'react';

/**
 * Skeleton — phosphor-tinted shimmer placeholder. variant:
 * text | row (table row) | card (scorecard) | radar (circular).
 */
export function Skeleton({ variant = 'text', width, height, lines = 3, style, ...rest }) {
  const base = {
    background: 'linear-gradient(90deg, rgba(147,164,179,0.06) 0%, rgba(61,255,162,0.10) 50%, rgba(147,164,179,0.06) 100%)',
    backgroundSize: '200% 100%',
    animation: 'hr-shimmer 1.4s linear infinite',
    borderRadius: 'var(--radius-sm)',
  };
  const css = (
    <style>{`@keyframes hr-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      @media (prefers-reduced-motion: reduce){.hr-skel{animation:none!important}}`}</style>
  );

  if (variant === 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: width || '100%', ...style }} {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="hr-skel" style={{ ...base, height: 11, width: i === lines - 1 ? '60%' : '100%' }} />
        ))}
        {css}
      </div>
    );
  }
  if (variant === 'row') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px', border: 'var(--border-1)', borderRadius: 'var(--radius-card)', background: 'var(--bg-raised)', ...style }} {...rest}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div className="hr-skel" style={{ ...base, height: 13, width: '45%' }} />
          <div className="hr-skel" style={{ ...base, height: 10, width: '70%' }} />
        </div>
        <div className="hr-skel" style={{ ...base, width: 40, height: 40, borderRadius: '50%' }} />
        {css}
      </div>
    );
  }
  if (variant === 'card') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--pad-card)', border: 'var(--border-1)', borderRadius: 'var(--radius-card)', background: 'var(--bg-raised)', minWidth: 150, ...style }} {...rest}>
        <div className="hr-skel" style={{ ...base, height: 9, width: '40%' }} />
        <div className="hr-skel" style={{ ...base, height: 30, width: '70%' }} />
        <div className="hr-skel" style={{ ...base, height: 9, width: '55%' }} />
        {css}
      </div>
    );
  }
  // radar
  return (
    <div style={{ display: 'inline-flex', ...style }} {...rest}>
      <div className="hr-skel" style={{ ...base, width: width || 120, height: height || 120, borderRadius: '50%' }} />
      {css}
    </div>
  );
}
