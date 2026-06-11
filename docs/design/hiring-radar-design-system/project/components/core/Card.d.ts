import * as React from 'react';

/** Base surface/panel. raised (card) | glass (overlay) | flush (panel). */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default 'raised' */
  variant?: 'raised' | 'glass' | 'flush';
  /** Mono section label rendered in a header bar. */
  header?: React.ReactNode;
  /** Header-right action node(s). */
  actions?: React.ReactNode;
  /** Phosphor glow halo. @default false */
  glow?: boolean;
  /** Apply default panel padding to the body. @default true */
  padding?: boolean;
}
export function Card(props: CardProps): JSX.Element;
