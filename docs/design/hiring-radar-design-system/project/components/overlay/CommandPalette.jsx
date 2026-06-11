import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * CommandPalette — ⌘K glass panel with mono input and grouped results.
 * groups: array of { label, items: [{ id, label, icon?, hint? }] }.
 * Shows a no-results state with a fallthrough to "search postings instead".
 */
export function CommandPalette({ open, onClose, groups = [], placeholder = 'Type a command or search…', onSelect, onSearchFallback }) {
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 30); } }, [open]);

  const filtered = groups
    .map((g) => ({ ...g, items: g.items.filter((it) => it.label.toLowerCase().includes(query.toLowerCase())) }))
    .filter((g) => g.items.length);
  const flat = filtered.flatMap((g) => g.items);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose && onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (flat.length) { onSelect && onSelect(flat[active]); }
        else { onSearchFallback && onSearchFallback(query); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, flat, active, query]);

  if (!open) return null;
  let idx = -1;
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-palette)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '14vh', background: 'rgba(3,5,8,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: 560, maxWidth: '92vw', maxHeight: '64vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--glass)', backdropFilter: 'blur(var(--blur-glass))', WebkitBackdropFilter: 'blur(var(--blur-glass))',
          border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-panel), var(--glow-phosphor-sm)',
          animation: 'hr-pop var(--dur) var(--ease-out)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: '1px solid var(--divider)' }}>
          <Icon name="command" size={18} style={{ color: 'var(--phosphor)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            placeholder={placeholder}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-hi)', font: 'var(--mono-base)' }}
          />
          <kbd style={{ font: 'var(--mono-sm)', color: 'var(--text-low-content)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px 6px' }}>ESC</kbd>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
          {flat.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, font: 'var(--text-sm)', color: 'var(--text-body)' }}>
                No matches for <span style={{ font: 'var(--mono-sm)', color: 'var(--text-hi)' }}>"{query}"</span>
              </p>
              <p style={{ margin: '6px 0 0', font: 'var(--mono-sm)', color: 'var(--text-low-content)' }}>
                Press <kbd style={{ color: 'var(--phosphor)' }}>Enter</kbd> to search postings instead
              </p>
            </div>
          ) : filtered.map((g) => (
            <div key={g.label} style={{ marginBottom: 4 }}>
              <div style={{ padding: '8px 10px 4px', font: 'var(--label-mono)', letterSpacing: 'var(--label-tracking)', textTransform: 'uppercase', color: 'var(--text-label)' }}>{g.label}</div>
              {g.items.map((it) => {
                idx++; const cur = idx === active;
                return (
                  <button
                    key={it.id}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => onSelect && onSelect(it)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px',
                      background: cur ? 'var(--phosphor-12)' : 'transparent', border: 'none',
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left',
                      color: cur ? 'var(--text-hi)' : 'var(--text-body)', font: 'var(--text-sm)',
                    }}
                  >
                    {it.icon && <Icon name={it.icon} size={16} style={{ color: cur ? 'var(--phosphor)' : 'var(--text-low-content)' }} />}
                    <span style={{ flex: 1 }}>{it.label}</span>
                    {it.hint && <kbd style={{ font: 'var(--mono-sm)', color: 'var(--text-low-content)' }}>{it.hint}</kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <style>{`@keyframes hr-pop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
          @media (prefers-reduced-motion: reduce){[aria-label="Command palette"]{animation:none!important}}`}</style>
      </div>
    </div>
  );
}
