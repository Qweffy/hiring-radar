import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * Menu — dropdown menu. items: array of
 * { label, icon?, danger?, shortcut?, onSelect } or { divider: true }.
 * `trigger` is the clickable node; menu anchors below it.
 */
export function Menu({ trigger, items = [], align = 'left', open: controlledOpen, onOpenChange, style, ...rest }) {
  const [uOpen, setUOpen] = React.useState(false);
  const open = controlledOpen != null ? controlledOpen : uOpen;
  const setOpen = (v) => { onOpenChange ? onOpenChange(v) : setUOpen(v); };
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', ...style }} {...rest}>
      <span onClick={() => setOpen(!open)}>{trigger}</span>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: '100%', [align]: 0, marginTop: 6, zIndex: 'var(--z-dropdown)',
            minWidth: 184, padding: 5,
            background: 'var(--bg-raised)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-control)', boxShadow: 'var(--shadow-pop)',
          }}
        >
          {items.map((it, i) => it.divider ? (
            <div key={i} style={{ height: 1, background: 'var(--divider)', margin: '5px 0' }} />
          ) : (
            <button
              key={i}
              role="menuitem"
              onClick={() => { it.onSelect && it.onSelect(); setOpen(false); }}
              className="hr-menuitem"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 8px',
                background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                color: it.danger ? 'var(--red)' : 'var(--text-body)', font: 'var(--text-sm)', textAlign: 'left',
              }}
            >
              {it.icon && <Icon name={it.icon} size={16} style={{ flexShrink: 0 }} />}
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.shortcut && <kbd style={{ font: 'var(--mono-sm)', color: 'var(--text-low-content)' }}>{it.shortcut}</kbd>}
            </button>
          ))}
          <style>{`.hr-menuitem:hover{background:var(--phosphor-08)!important;color:var(--text-hi)!important}
            .hr-menuitem:hover[style*="--red"]{background:var(--red-14)!important}`}</style>
        </div>
      )}
    </span>
  );
}
