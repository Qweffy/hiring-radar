import * as React from 'react';

/** Styled native <select>. Pass <option> children. */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  error?: boolean;
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
}
export function Select(props: SelectProps): JSX.Element;
