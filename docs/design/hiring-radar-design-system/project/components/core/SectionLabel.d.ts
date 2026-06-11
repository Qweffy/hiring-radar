import * as React from 'react';
import { IconName } from './Icon';

/** Uppercase 11px mono terminal section label for chrome headers. */
export interface SectionLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** Optional leading icon. */
  icon?: IconName;
  /** @default 'low' */
  tone?: 'low' | 'phosphor' | 'violet' | 'amber';
}
export function SectionLabel(props: SectionLabelProps): JSX.Element;
