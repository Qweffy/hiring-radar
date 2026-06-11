import React from 'react';
import { Tag } from './Tag.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { ScoreGauge } from './ScoreGauge.jsx';
import { IconButton } from '../core/IconButton.jsx';

/**
 * JobRow — one HN "Who is hiring" posting as a table row: company, role,
 * salary (mono), location, stack tags, status badges, and a match gauge.
 * States: default, hover (border glows), selected, and stale (amber dot).
 */
export function JobRow({
  company, role, salary, location, tags = [], badges = [], score,
  selected = false, stale = false, bookmarked = false,
  onSelect, onBookmark, style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const active = selected || hover;
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 16,
        padding: '12px 14px',
        background: selected ? 'var(--phosphor-08)' : 'var(--bg-raised)',
        border: `1px solid ${selected ? 'var(--border-strong)' : active ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-card)',
        boxShadow: active ? 'var(--glow-phosphor-sm)' : 'none',
        cursor: 'pointer', transition: 'border-color var(--dur-fast), box-shadow var(--dur), background var(--dur-fast)',
        ...style,
      }}
      {...rest}
    >
      {/* main */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {stale && <span title="Edited since last sweep" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)', boxShadow: '0 0 8px rgba(255,200,87,0.6)', flexShrink: 0 }} />}
          <span style={{ font: 'var(--text-h3)', color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company}</span>
          <span style={{ color: 'var(--text-low)' }}>·</span>
          <span style={{ font: 'var(--text-base)', color: 'var(--text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {salary && <span style={{ font: 'var(--mono-base)', color: 'var(--phosphor)' }}>{salary}</span>}
          {location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: 'var(--mono-sm)', color: 'var(--text-low-content)' }}>{location}</span>}
          {badges.map((b) => <StatusBadge key={b} status={b} />)}
          {tags.slice(0, 4).map((t) => <Tag key={t}>{t}</Tag>)}
          {tags.length > 4 && <span style={{ font: 'var(--mono-sm)', color: 'var(--text-low-content)' }}>+{tags.length - 4}</span>}
        </div>
      </div>
      {/* score */}
      {score != null && <ScoreGauge score={score} size={48} />}
      {/* actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
        <IconButton icon="bookmark" label={bookmarked ? 'Saved' : 'Save'} active={bookmarked} onClick={onBookmark} size="sm" />
        <IconButton icon="kebab" label="More" size="sm" />
      </div>
    </div>
  );
}
