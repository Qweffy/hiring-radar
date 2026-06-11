import * as React from 'react';

/**
 * Full-width banner under the topbar. amber = warning/stale, violet = AI degraded,
 * red = failure. Optional action button + dismiss.
 */
export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default 'amber' */
  tone?: 'amber' | 'violet' | 'red';
  children: React.ReactNode;
  /** Truthy renders an action button. */
  action?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
}
export function Banner(props: BannerProps): JSX.Element;
