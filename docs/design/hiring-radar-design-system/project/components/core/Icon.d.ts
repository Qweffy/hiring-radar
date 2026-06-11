import * as React from 'react';

export type IconName =
  | 'search' | 'radar' | 'list' | 'bookmark' | 'bot' | 'user' | 'server'
  | 'settings' | 'play' | 'pause' | 'retry' | 'external-link' | 'copy'
  | 'kebab' | 'filter' | 'close' | 'check' | 'alert-triangle'
  | 'chevron-down' | 'chevron-right' | 'chevron-left' | 'command'
  | 'map-pin' | 'clock' | 'x-circle' | 'arrow-right' | 'bell' | 'signal'
  | 'zap' | 'database' | 'info' | 'inbox';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon glyph name from the Hiring Radar set. */
  name: IconName;
  /** Pixel size (width = height). Use 16 or 20. @default 20 */
  size?: number;
  /** Stroke width. @default 1.5 */
  strokeWidth?: number;
}

/** A single Lucide-style stroke icon rendered in currentColor. */
export function Icon(props: IconProps): JSX.Element;
