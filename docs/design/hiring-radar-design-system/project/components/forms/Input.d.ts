import * as React from 'react';
import { IconName } from '../core/Icon';

/** Text input with optional leading icon, mono mode, and error state. */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: IconName;
  /** Error message (string) renders red border + message; `true` = border only. */
  error?: string | boolean;
  /** Render value in JetBrains Mono (for data entry). @default false */
  mono?: boolean;
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
}
export function Input(props: InputProps): JSX.Element;
