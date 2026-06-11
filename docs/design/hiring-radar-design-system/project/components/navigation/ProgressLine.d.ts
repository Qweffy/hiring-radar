import * as React from 'react';

/** Thin progress line. Phosphor (default) or violet (AI work). */
export interface ProgressLineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100. Ignored when indeterminate. */
  value?: number;
  /** @default 'phosphor' */
  tone?: 'phosphor' | 'violet';
  /** Animated indeterminate sweep. @default false */
  indeterminate?: boolean;
}
export function ProgressLine(props: ProgressLineProps): JSX.Element;
