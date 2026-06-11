import React from 'react';

/**
 * ProgressLine — thin determinate/indeterminate progress bar.
 * Phosphor by default, violet for AI/agent work.
 */
export function ProgressLine({ value, tone = 'phosphor', indeterminate = false, style, ...rest }) {
  const color = tone === 'violet' ? 'var(--violet)' : 'var(--phosphor)';
  const glow = tone === 'violet' ? 'var(--glow-violet)' : 'var(--glow-phosphor-sm)';
  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'relative', width: '100%', height: 3, overflow: 'hidden',
        background: 'rgba(147,164,179,0.12)', borderRadius: 2, ...style,
      }}
      {...rest}
    >
      {indeterminate ? (
        <div
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '35%',
            background: color, boxShadow: glow, borderRadius: 2,
            animation: 'hr-indeterminate 1.2s var(--ease-in-out) infinite',
          }}
        />
      ) : (
        <div
          style={{
            height: '100%', width: `${Math.max(0, Math.min(100, value))}%`,
            background: color, boxShadow: glow, borderRadius: 2,
            transition: 'width var(--dur) var(--ease-out)',
          }}
        />
      )}
      <style>{`
        @keyframes hr-indeterminate { 0%{left:-35%} 100%{left:100%} }
        @media (prefers-reduced-motion: reduce){
          div[role="progressbar"] > div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
