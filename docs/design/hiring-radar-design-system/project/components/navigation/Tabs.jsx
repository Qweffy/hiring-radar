import React from 'react';

/**
 * Tabs — filter tabs with mono counts. Underline indicator in phosphor.
 * tabs: array of { value, label, count? }.
 */
export function Tabs({ tabs, value, onChange, style, ...rest }) {
  return (
    <div
      role="tablist"
      style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--divider)', ...style }}
      {...rest}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange && onChange(tab.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: selected ? 'var(--text-hi)' : 'var(--text-mid)',
              font: '500 13px/1 var(--font-ui)',
              borderBottom: `2px solid ${selected ? 'var(--phosphor)' : 'transparent'}`,
              marginBottom: -1, transition: 'color var(--dur-fast)',
            }}
          >
            {tab.label}
            {tab.count != null && (
              <span style={{
                font: '600 11px/1 var(--font-mono)',
                color: selected ? 'var(--phosphor)' : 'var(--text-low-content)',
                background: selected ? 'var(--phosphor-12)' : 'rgba(147,164,179,0.10)',
                borderRadius: 'var(--radius-sm)', padding: '3px 6px',
              }}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
