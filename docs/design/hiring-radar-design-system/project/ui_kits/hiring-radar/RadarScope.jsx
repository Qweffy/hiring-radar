// RadarScope — the live radar panel: rings, conic sweep, plotted blips.
function RadarScope({ size = 200, blips = [] }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,255,162,0.06), transparent 70%)' }} />
      {[0, 0.2, 0.4].map((f, i) => (
        <div key={i} style={{ position: 'absolute', inset: size * f, borderRadius: '50%', border: '1px solid var(--phosphor-dim)' }} />
      ))}
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--phosphor-dim)' }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--phosphor-dim)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
        <div className="hr-sweep" style={{ position: 'absolute', inset: 0, background: 'conic-gradient(from 0deg, rgba(61,255,162,0.4) 0deg, rgba(61,255,162,0.08) 26deg, transparent 60deg)' }} />
      </div>
      {blips.map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: 8, height: 8, marginLeft: -4, marginTop: -4, borderRadius: '50%', background: b.ai ? 'var(--violet)' : 'var(--phosphor)', boxShadow: b.ai ? 'var(--glow-violet)' : 'var(--glow-phosphor-sm)' }}>
          <div className="hr-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: b.ai ? 'var(--violet)' : 'var(--phosphor)', animationDelay: `${i * 0.4}s` }} />
        </div>
      ))}
      <style>{`
        @keyframes hr-sweep { to { transform: rotate(360deg); } }
        .hr-sweep { animation: hr-sweep 4s linear infinite; }
        @keyframes hr-ping2 { 0%{transform:scale(1);opacity:.7} 80%,100%{transform:scale(3);opacity:0} }
        .hr-ping { animation: hr-ping2 1.8s var(--ease-out) infinite; }
        @media (prefers-reduced-motion: reduce){ .hr-sweep,.hr-ping{ animation: none; } }
      `}</style>
    </div>
  );
}
window.RadarScope = RadarScope;
