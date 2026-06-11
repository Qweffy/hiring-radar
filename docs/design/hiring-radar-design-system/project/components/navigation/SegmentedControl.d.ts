import * as React from 'react';
import { IconName } from '../core/Icon';

export interface SegmentOption {
  value: string;
  label: string;
  icon?: IconName;
}

/** Mono segmented toggle for 2-4 mutually-exclusive modes (e.g. search mode). */
export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange?: (value: string) => void;
  /** @default 'md' */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}
export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
