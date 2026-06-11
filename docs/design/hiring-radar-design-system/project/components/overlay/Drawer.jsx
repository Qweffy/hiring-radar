import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * Drawer — side panel sliding from the right (default) or left. Esc closes,
 * focus trapped, focus returns to trigger. Used for posting detail / agent trace.
 */
export function Drawer({ open, onClose, title, children, footer, side = 'right', width = 440, style, ...rest }) {
  const ref = React.useRef(null);
  const prevFocus = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => { const f = ref.current && ref.current.querySelector('button,[href],input,[tabindex]'); f && f.focus(); }, 30);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); if (prevFocus.current && prevFocus.current.focus) prevFocus.current.focus(); };
  }, [open]);
  if (!open) return null;
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-drawer)', display: 'flex', justifyContent: side === 'right' ? 'flex-end' : 'flex-start', background: 'rgba(3,5,8,0.5)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        style={{
          width, maxWidth: '94vw', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'var(--bg-surface)', borderLeft: side === 'right' ? '1px solid var(--border-strong)' : 'none',
          borderRight: side === 'left' ? '1px solid var(--border-strong)' : 'none',
          boxShadow: 'var(--shadow-panel)',
          animation: `hr-slide-${side} var(--dur-slow) var(--ease-out)`, ...style,
        }}
        {...rest}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--divider)' }}>
          <h3 style={{ font: 'var(--text-h3)', color: 'var(--text-hi)' }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-low-content)' }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 18px', borderTop: '1px solid var(--divider)' }}>{footer}</div>}
        <style>{`@keyframes hr-slide-right{from{transform:translateX(100%)}to{transform:none}}
          @keyframes hr-slide-left{from{transform:translateX(-100%)}to{transform:none}}
          @media (prefers-reduced-motion: reduce){[role="dialog"]{animation:none!important}}`}</style>
      </div>
    </div>
  );
}
