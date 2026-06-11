import * as React from 'react';

export interface SpinnerProps {
  /** Diameter in px. @default 16 */
  size?: number;
  /** Stroke color. @default 'currentColor' */
  color?: string;
  style?: React.CSSProperties;
}

/** Inline phosphor spinner; static under prefers-reduced-motion. */
export function Spinner(props: SpinnerProps): JSX.Element;
