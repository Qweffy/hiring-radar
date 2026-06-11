import React from 'react';

/**
 * ScoreGauge — radial match-score gauge 0-100 in violet, number in mono.
 * Animates the arc + counts up on mount (degrades to static under reduced-motion).
 */
export function ScoreGauge({ score = 0, size = 64, label, style, ...rest }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = React.useState(reduce ? score : 0);
  React.useEffect(() => {
    if (reduce) { setShown(score); return; }
    let raf, start;
    const dur = 600;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const stroke = Math.max(4, size * 0.09);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, shown)) / 100;
  const numFont = size >= 56 ? 'var(--mono-lg)' : '600 13px/1 var(--font-mono)';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, ...style }} {...rest}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(167,139,250,0.16)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--violet)" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
            style={{ filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.45))', transition: reduce ? 'none' : 'stroke-dashoffset 80ms linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: numFont, color: 'var(--text-hi)' }}>
          {shown}
        </div>
      </div>
      {label && <span style={{ font: 'var(--label-mono)', letterSpacing: 'var(--label-tracking)', textTransform: 'uppercase', color: 'var(--text-label)' }}>{label}</span>}
    </div>
  );
}
