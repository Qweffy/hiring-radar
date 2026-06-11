import * as React from 'react';

/**
 * AI match-strength pill (violet). Use only where ScoreGauge doesn't fit.
 * Opacity encodes strength: HIGH 100% / MED 60% / LOW 35%.
 */
export interface MatchBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default 'MED' */
  level?: 'HIGH' | 'MED' | 'LOW';
  /** Optional numeric score appended in mono. */
  score?: number;
}
export function MatchBadge(props: MatchBadgeProps): JSX.Element;
