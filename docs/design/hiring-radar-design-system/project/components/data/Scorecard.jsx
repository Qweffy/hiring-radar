import React from 'react';
import { Sparkline } from './Sparkline.jsx';

/**
 * Scorecard — a metric tile: uppercase label, big mono number (counts up on mount),
 * optional delta and sparkline. The atom of the mission-control dashboard.
 */
export function Scorecard({ label, value = 0, suffix = '', delta, spark, tone = 'phosphor', style, ...rest }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = React.useState(reduce ? value : 0);
  React.useEffect(() => {
    if (reduce) { setShown(value); return; }
    let raf, start; const dur = 600;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const accent = tone === 'violet' ? 'var(--violet)' : tone === 'cyan' ? 'var(--cyan)' : 'var(--text-hi)';
  const deltaUp = delta != null && delta >= 0;

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 10, padding: 'var(--pad-card)', minWidth: 150,
        background: 'var(--bg-raised)', border: 'var(--border-1)', borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)', ...style,
      }}
      {...rest}
    >
      <span style={{ font: 'var(--label-mono)', letterSpacing: 'var(--label-tracking)', textTransform: 'uppercase', color: 'var(--text-label)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ font: 'var(--mono-xl)', color: accent, letterSpacing: '-0.01em' }}>{shown.toLocaleString()}</span>
          {suffix && <span style={{ font: 'var(--mono-base)', color: 'var(--text-low-content)' }}>{suffix}</span>}
        </div>
        {spark && <Sparkline data={spark} tone={tone === 'text-hi' ? 'phosphor' : tone} />}
      </div>
      {delta != null && (
        <span style={{ font: 'var(--mono-sm)', color: deltaUp ? 'var(--phosphor)' : 'var(--red)' }}>
          {deltaUp ? '+' : ''}{delta}{typeof delta === 'number' ? '' : ''} <span style={{ color: 'var(--text-low-content)' }}>vs last sweep</span>
        </span>
      )}
    </div>
  );
}
