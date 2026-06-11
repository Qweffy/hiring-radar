import * as React from 'react';

export type StatusValue =
  | 'NEW' | 'REMOTE' | 'ONSITE' | 'HYBRID' | 'VISA'
  | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'RESUMED' | 'CANCELLED'
  | 'CRON' | 'MANUAL' | 'BACKFILL';

/**
 * Mono uppercase status pill. Color, dot, and pulse derive from `status`.
 * Use for posting attributes (NEW/REMOTE/VISA), run states (RUNNING/FAILED…),
 * and triggers (CRON/MANUAL/BACKFILL).
 */
export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusValue | string;
  /** Override the displayed text (defaults to the uppercased status). */
  label?: string;
}
export function StatusBadge(props: StatusBadgeProps): JSX.Element;
