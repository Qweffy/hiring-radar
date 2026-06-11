import * as React from 'react';

/** Radial 0-100 match-score gauge in violet with a mono number; counts up on mount. */
export interface ScoreGaugeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100. */
  score?: number;
  /** Diameter in px. @default 64 */
  size?: number;
  /** Optional mono label beneath. */
  label?: string;
}
export function ScoreGauge(props: ScoreGaugeProps): JSX.Element;
