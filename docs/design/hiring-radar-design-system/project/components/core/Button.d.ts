import * as React from 'react';
import { IconName } from './Icon';

/**
 * Primary action control. Phosphor primary glows; secondary/ghost/destructive
 * are outline or text. All numeric labels inside should use mono.
 *
 * @startingPoint section="Core" subtitle="Buttons in every variant + state" viewport="700x180"
 */
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Visual weight. @default 'secondary' */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Leading icon name. */
  iconLeft?: IconName;
  /** Trailing icon name. */
  iconRight?: IconName;
  /** Swap content for an inline spinner and disable. @default false */
  loading?: boolean;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
