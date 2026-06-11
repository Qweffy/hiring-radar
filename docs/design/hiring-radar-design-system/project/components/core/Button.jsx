import React from 'react';
import { Icon } from './Icon.jsx';
import { Spinner } from './Spinner.jsx';

const SIZES = {
  sm: { height: 'var(--control-h-sm)', padding: '0 12px', font: 'var(--text-xs)', gap: 6, icon: 16 },
  md: { height: 'var(--control-h)', padding: '0 14px', font: '500 14px/1 var(--font-ui)', gap: 8, icon: 16 },
  lg: { height: 'var(--control-h-lg)', padding: '0 20px', font: '500 15px/1 var(--font-ui)', gap: 8, icon: 20 },
};

const VARIANTS = {
  primary: {
    background: 'var(--phosphor)', color: '#04130C', border: '1px solid transparent',
    boxShadow: 'var(--glow-phosphor)', fontWeight: 600,
    hoverBg: '#5affb4', activeBg: '#2fe592',
  },
  secondary: {
    background: 'transparent', color: 'var(--text-hi)', border: '1px solid var(--border-strong)',
    hoverBg: 'var(--phosphor-08)', activeBg: 'var(--phosphor-12)',
  },
  ghost: {
    background: 'transparent', color: 'var(--text-body)', border: '1px solid transparent',
    hoverBg: 'rgba(147,164,179,0.08)', activeBg: 'rgba(147,164,179,0.14)',
  },
  destructive: {
    background: 'transparent', color: 'var(--red)', border: '1px solid rgba(255,93,93,0.42)',
    hoverBg: 'var(--red-14)', activeBg: 'rgba(255,93,93,0.22)',
  },
};

/**
 * Button — primary action control. Phosphor primary glows; others are outline/ghost.
 */
export function Button({
  variant = 'secondary', size = 'md', iconLeft, iconRight,
  loading = false, disabled = false, children, style, onClick, type = 'button', ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const sz = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.secondary;
  const isDisabled = disabled || loading;

  const bg = isDisabled ? undefined : active ? v.activeBg : hover ? v.hoverBg : v.background;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      aria-busy={loading || undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sz.gap,
        height: sz.height, padding: sz.padding, font: sz.font,
        fontWeight: v.fontWeight || 500,
        color: v.color, background: bg ?? v.background, border: v.border,
        borderRadius: 'var(--radius-control)',
        letterSpacing: '0.005em',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.4 : 1,
        boxShadow: variant === 'primary' && !isDisabled ? (hover ? '0 0 28px rgba(61,255,162,0.38)' : v.boxShadow) : 'none',
        transition: 'background var(--dur-fast) var(--ease-out), box-shadow var(--dur) var(--ease-out), opacity var(--dur-fast)',
        whiteSpace: 'nowrap', userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {loading && <Spinner size={sz.icon} color={variant === 'primary' ? '#04130C' : 'currentColor'} />}
      {!loading && iconLeft && <Icon name={iconLeft} size={sz.icon} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={sz.icon} />}
    </button>
  );
}
