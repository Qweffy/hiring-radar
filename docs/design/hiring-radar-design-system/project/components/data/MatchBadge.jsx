import React from 'react';

const LEVELS = {
  HIGH: { op: 1, label: 'HIGH' },
  MED: { op: 0.6, label: 'MED' },
  LOW: { op: 0.35, label: 'LOW' },
};

/**
 * MatchBadge — AI match-strength pill in violet. Used in narrow layouts where the
 * radial ScoreGauge doesn't fit. Opacity encodes strength: HIGH 100% / MED 60% / LOW 35%.
 */
export function MatchBadge({ level = 'MED', score, style, ...rest }) {
  const key = String(level).toUpperCase();
  const l = LEVELS[key] || LEVELS.MED;
  const color = `rgba(167,139,250,${l.op})`;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 20, padding: '0 7px',
        font: '600 10px/1 var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
        color: color, background: `rgba(167,139,250,${l.op * 0.14})`,
        border: `1px solid rgba(167,139,250,${l.op * 0.5})`, borderRadius: 'var(--radius-sm)',
        whiteSpace: 'nowrap', ...style,
      }}
      {...rest}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {l.label}{score != null && <span style={{ opacity: 0.85 }}>{score}</span>}
    </span>
  );
}
