import * as React from 'react';

/** The primary scan field: mono placeholder, ⌘K hint, optional clear button. */
export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** @default 'scan postings…' */
  placeholder?: string;
  /** Keycap hint shown at right when empty. @default '⌘K' */
  hint?: string;
  /** When provided and value is non-empty, shows a clear (×) button. */
  onClear?: () => void;
  /** @default 'md' */
  size?: 'md' | 'lg';
}
export function SearchInput(props: SearchInputProps): JSX.Element;
