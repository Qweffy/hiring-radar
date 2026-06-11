import * as React from 'react';
import { IconName } from '../core/Icon';

/** Mono outline chip — stack tags ("Rust", "k8s") and removable filter chips. */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** @default 'neutral' */
  tone?: 'neutral' | 'phosphor' | 'cyan' | 'violet' | 'amber';
  icon?: IconName;
  /** When provided, renders an × that calls this. Turns the tag into a filter chip. */
  onRemove?: () => void;
  selected?: boolean;
}
export function Tag(props: TagProps): JSX.Element;
