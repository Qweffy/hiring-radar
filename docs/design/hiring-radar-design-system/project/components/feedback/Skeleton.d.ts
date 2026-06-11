import * as React from 'react';

/** Phosphor-tinted shimmer placeholder; static under reduced-motion. */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default 'text' */
  variant?: 'text' | 'row' | 'card' | 'radar';
  width?: number | string;
  height?: number | string;
  /** Line count for variant="text". @default 3 */
  lines?: number;
}
export function Skeleton(props: SkeletonProps): JSX.Element;
