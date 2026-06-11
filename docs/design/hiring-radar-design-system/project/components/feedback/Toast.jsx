import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONES = {
  success: { c: 'var(--phosphor)', icon: 'check', glow: 'var(--glow-phosphor-sm)' },
  error: { c: 'var(--red)', icon: 'x-circle', glow: 'var(--glow-red)' },
  warning: { c: 'var(--amber)', icon: 'alert-triangle', glow: 'none' },
  info: { c: 'var(--cyan)', icon: 'info', glow: 'var(--glow-cyan)' },
};

/**
 * Toast — transient notification on glass. Tones success/error/warning/info,
 * plus action variants: Retry, and Undo with a mono countdown ("Undo (8s)").
 */
export function Toast({
  tone = 'info', title, message, action, onAction, actionLabel,
  undoSeconds, onUndo, onClose, style, ...rest
}) {
  const t = TONES[tone] || TONES.info;
  const [secs, setSecs] = React.useState(undoSeconds);
  React.useEffect(() => {
    if (undoSeconds == null) return;
    setSecs(undoSeconds);
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [undoSeconds]);

  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, width: 360, maxWidth: '90vw',
        padding: '12px 14px', background: 'var(--glass)', backdropFilter: 'blur(var(--blur-glass))',
        WebkitBackdropFilter: 'blur(var(--blur-glass))',
        border: '1px solid var(--border)', borderLeft: `2px solid ${t.c}`,
        borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-pop)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ color: t.c, marginTop: 1, filter: t.glow !== 'none' ? `drop-shadow(0 0 6px ${t.c})` : 'none' }}>
        <Icon name={t.icon} size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {title && <span style={{ font: '600 13px/1.3 var(--font-ui)', color: 'var(--text-hi)' }}>{title}</span>}
        {message && <span style={{ font: 'var(--text-sm)', color: 'var(--text-body)' }}>{message}</span>}
        {(action || undoSeconds != null) && (
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {undoSeconds != null && (
              <button onClick={onUndo} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'var(--mono-sm)', color: t.c }}>
                Undo ({secs}s)
              </button>
            )}
            {action && (
              <button onClick={onAction} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: '600 12px/1 var(--font-ui)', color: t.c }}>
                {action === 'retry' && <Icon name="retry" size={13} />}{actionLabel || (action === 'retry' ? 'Retry' : 'Action')}
              </button>
            )}
          </div>
        )}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-low-content)' }}>
          <Icon name="close" size={15} />
        </button>
      )}
    </div>
  );
}
