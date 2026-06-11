import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * Modal — centered dialog on a blurred scrim. Esc closes, focus is trapped,
 * focus returns to the previously-focused element on close.
 */
export function Modal({ open, onClose, title, children, footer, width = 460, style, ...rest }) {
  const panelRef = React.useRef(null);
  const prevFocus = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = () => panel ? panel.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])') : [];
    const first = focusables()[0];
    if (first) first.focus(); else if (panel) panel.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose && onClose(); }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prevFocus.current && prevFocus.current.focus) prevFocus.current.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'rgba(3,5,8,0.62)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        animation: 'hr-fade var(--dur) var(--ease-out)',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        style={{
          width, maxWidth: '100%', maxHeight: '88vh', overflow: 'auto', outline: 'none',
          background: 'var(--bg-raised)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-panel)',
          animation: 'hr-pop var(--dur) var(--ease-out)', ...style,
        }}
        {...rest}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--divider)' }}>
            <h3 style={{ font: 'var(--text-h3)', color: 'var(--text-hi)' }}>{title}</h3>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-low-content)' }}>
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        <div style={{ padding: 18 }}>{children}</div>
        {footer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 18px', borderTop: '1px solid var(--divider)' }}>
            {footer}
          </div>
        )}
        <style>{`@keyframes hr-fade{from{opacity:0}to{opacity:1}}
          @keyframes hr-pop{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
          @media (prefers-reduced-motion: reduce){[role="dialog"],[role="dialog"]+*{animation:none!important}}`}</style>
      </div>
    </div>
  );
}
