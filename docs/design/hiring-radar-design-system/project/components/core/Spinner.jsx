import React from 'react';

/** Inline phosphor spinner — degrades to a static ring under reduced-motion via CSS. */
export function Spinner({ size = 16, color = 'currentColor', style }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block', animation: 'hr-spin 0.7s linear infinite', ...style }}
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity="0.22" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <style>{`@keyframes hr-spin{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion: reduce){svg[style*="hr-spin"]{animation:none!important}}`}</style>
    </svg>
  );
}
