import React from 'react';

// Status -> { color, dot, fill }. Covers posting attributes, process states, triggers.
const STATUS = {
  // posting attributes
  NEW: { c: 'var(--phosphor)', f: 'var(--phosphor-12)', b: 'var(--border-strong)', dot: true },
  REMOTE: { c: 'var(--cyan)', f: 'var(--cyan-12)', b: 'rgba(76,201,240,0.35)' },
  ONSITE: { c: 'var(--text-mid)', f: 'transparent', b: 'var(--border)' },
  HYBRID: { c: 'var(--text-mid)', f: 'transparent', b: 'var(--border)' },
  VISA: { c: 'var(--violet)', f: 'var(--violet-12)', b: 'rgba(167,139,250,0.40)' },
  // process states
  RUNNING: { c: 'var(--phosphor)', f: 'var(--phosphor-12)', b: 'var(--border-strong)', pulse: true },
  COMPLETED: { c: 'var(--phosphor)', f: 'var(--phosphor-08)', b: 'var(--border)' },
  FAILED: { c: 'var(--red)', f: 'var(--red-14)', b: 'rgba(255,93,93,0.42)' },
  PARTIAL: { c: 'var(--amber)', f: 'var(--amber-14)', b: 'rgba(255,200,87,0.38)' },
  RESUMED: { c: 'var(--cyan)', f: 'var(--cyan-12)', b: 'rgba(76,201,240,0.35)' },
  CANCELLED: { c: 'var(--text-low-content)', f: 'transparent', b: 'var(--border)' },
  // triggers
  CRON: { c: 'var(--text-mid)', f: 'transparent', b: 'var(--border)' },
  MANUAL: { c: 'var(--text-mid)', f: 'transparent', b: 'var(--border)' },
  BACKFILL: { c: 'var(--text-mid)', f: 'transparent', b: 'var(--border)' },
};

/**
 * StatusBadge — mono uppercase pill (sharp corners) for posting attributes,
 * process states, and run triggers. Status string drives color + optional dot/pulse.
 */
export function StatusBadge({ status, label, style, ...rest }) {
  const key = String(status).toUpperCase();
  const s = STATUS[key] || { c: 'var(--text-mid)', f: 'transparent', b: 'var(--border)' };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 20, padding: '0 7px',
        font: '600 10px/1 var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase',
        color: s.c, background: s.f, border: `1px solid ${s.b}`, borderRadius: 'var(--radius-sm)',
        whiteSpace: 'nowrap', ...style,
      }}
      {...rest}
    >
      {(s.dot || s.pulse) && (
        <span style={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: s.c }} />
          {s.pulse && <span className="hr-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: s.c }} />}
        </span>
      )}
      {label || key}
      <style>{`@keyframes hr-ping{0%{transform:scale(1);opacity:.7}80%,100%{transform:scale(2.6);opacity:0}}
        .hr-pulse{animation:hr-ping 1.8s var(--ease-out) infinite}
        @media (prefers-reduced-motion: reduce){.hr-pulse{animation:none}}`}</style>
    </span>
  );
}
