import * as React from 'react';

/**
 * Metric tile: mono label, big mono number (counts up on mount), optional delta + sparkline.
 *
 * @startingPoint section="Data" subtitle="Dashboard metric tile with count-up + sparkline" viewport="240x150"
 */
export interface ScorecardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: number;
  /** Unit suffix in mono, e.g. "USD", "roles". */
  suffix?: string;
  /** Signed change vs last sweep. */
  delta?: number;
  /** Sparkline series. */
  spark?: number[];
  /** @default 'phosphor' */
  tone?: 'phosphor' | 'violet' | 'cyan';
}
export function Scorecard(props: ScorecardProps): JSX.Element;
