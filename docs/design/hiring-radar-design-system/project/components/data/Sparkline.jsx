import React from 'react';

/** Sparkline — tiny inline trend line. data: number[]. Phosphor by default. */
export function Sparkline({ data = [], width = 72, height = 22, tone = 'phosphor', style, ...rest }) {
  const color = tone === 'violet' ? 'var(--violet)' : tone === 'cyan' ? 'var(--cyan)' : 'var(--phosphor)';
  if (!data.length) return <svg width={width} height={height} style={style} {...rest} />;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${d} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`;
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible', ...style }} {...rest}>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="1.8" fill={color} />
    </svg>
  );
}
