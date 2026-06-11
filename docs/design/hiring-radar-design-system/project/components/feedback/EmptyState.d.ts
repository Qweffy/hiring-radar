import * as React from 'react';
import { IconName } from '../core/Icon';

/** Named asset from the canonical illustration pack (assets/illustrations/*.svg). */
export type IllustrationName =
  | 'empty-radar' | 'lonely-blip' | 'agent-orb-idle' | 'agent-orb-active'
  | 'flatline-calibration' | 'clean-signal' | 'lost-signal' | 'off-the-grid'
  | 'static-interference' | 'blip-sprite' | 'loading-sweep'
  | 'mark' | 'favicon' | 'wordmark'
  /** aliases */
  | 'radar' | 'bot' | 'agent-orb';

/**
 * Renders a named asset from the canonical illustration pack — the only
 * illustrations allowed in Hiring Radar. Artwork is embedded inline (identical
 * to the .svg files); filter ids are namespaced per instance.
 */
export interface HRIllustrationProps extends React.SVGProps<SVGSVGElement> {
  /** @default 'empty-radar' */
  name?: IllustrationName;
  /** Rendered width in px (height derives from the asset's aspect ratio). @default 120 */
  size?: number;
}
export function HRIllustration(props: HRIllustrationProps): JSX.Element;

/** Centered empty-state: pack illustration + headline + sub-line + optional action. */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pack illustration name, or a custom node. @default 'empty-radar' */
  illustration?: IllustrationName | React.ReactNode;
  title?: string;
  description?: React.ReactNode;
  /** Action button label (omit for no button). */
  action?: string;
  actionIcon?: IconName;
  onAction?: () => void;
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
