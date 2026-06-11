import React from 'react';
import { Icon } from './Icon.jsx';
import { Spinner } from './Spinner.jsx';

const SIZES = {
  sm: { box: 30, icon: 16 },
  md: { box: 36, icon: 18 },
  lg: { box: 44, icon: 20 },
};

/**
 * IconButton — square, icon-only control. Always pass `label` for a11y.
 */
export function IconButton({
  icon, label, variant = 'ghost', size = 'md', loading = false,
  disabled = false, active = false, style, onClick, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const sz = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  const tones = {
    ghost: { color: active ? 'var(--phosphor)' : 'var(--text-body)', hoverBg: 'rgba(147,164,179,0.08)' },
    solid: { color: '#04130C', hoverBg: '#5affb4' },
    danger: { color: 'var(--red)', hoverBg: 'var(--red-14)' },
  };
  const t = tones[variant] || tones.ghost;
  const base = variant === 'solid' ? 'var(--phosphor)' : active ? 'var(--phosphor-12)' : 'transparent';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: sz.box, height: sz.box, padding: 0,
        color: t.color,
        background: isDisabled ? 'transparent' : hover ? t.hoverBg : base,
        border: variant === 'solid' ? '1px solid transparent' : `1px solid ${active ? 'var(--border-strong)' : 'transparent'}`,
        borderRadius: 'var(--radius-control)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.4 : 1,
        boxShadow: variant === 'solid' && !isDisabled ? 'var(--glow-phosphor)' : 'none',
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast)',
        ...style,
      }}
      {...rest}
    >
      {loading
        ? <Spinner size={sz.icon} color={variant === 'solid' ? '#04130C' : 'currentColor'} />
        : <Icon name={icon} size={sz.icon} />}
    </button>
  );
}
