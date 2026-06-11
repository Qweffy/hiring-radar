import * as React from 'react';

/** Mono, instant tooltip wrapping a trigger element. */
export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: React.ReactNode;
  /** @default 'top' */
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}
export function Tooltip(props: TooltipProps): JSX.Element;
