import * as React from 'react';

/**
 * Recovery-oriented error pattern. Always renders a recovery action and a
 * plain-language cause — never a stack trace. Full uses the LOST SIGNAL
 * illustration; compact (inline/widget) uses STATIC INTERFERENCE or none.
 */
export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Plain-language cause headline. @default "Couldn't reach the database" */
  cause?: string;
  /** Optional secondary explanation. */
  detail?: React.ReactNode;
  /** @default 'red' */
  tone?: 'red' | 'amber';
  onRetry?: () => void;
  retryLabel?: string;
  /** Inline/widget sizing with the STATIC INTERFERENCE asset. @default false */
  compact?: boolean;
  /** Drop the illustration entirely (regions under ~200px). @default false */
  hideIllustration?: boolean;
}
export function ErrorState(props: ErrorStateProps): JSX.Element;
