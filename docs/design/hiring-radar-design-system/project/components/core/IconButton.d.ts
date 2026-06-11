import * as React from 'react';
import { IconName } from './Icon';

/** Square, icon-only button. `label` is required for accessibility. */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Accessible name (also used as tooltip title). */
  label: string;
  /** @default 'ghost' */
  variant?: 'ghost' | 'solid' | 'danger';
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Toggled/selected appearance. @default false */
  active?: boolean;
  loading?: boolean;
}

export function IconButton(props: IconButtonProps): JSX.Element;
