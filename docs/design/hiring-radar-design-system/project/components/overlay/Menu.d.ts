import * as React from 'react';
import { IconName } from '../core/Icon';

export interface MenuItem {
  label?: React.ReactNode;
  icon?: IconName;
  /** Red destructive styling. */
  danger?: boolean;
  /** Mono shortcut hint at right. */
  shortcut?: string;
  onSelect?: () => void;
  /** Render a divider instead of an item. */
  divider?: boolean;
}

/** Dropdown menu anchored below `trigger`. Closes on outside-click / Esc. */
export interface MenuProps extends React.HTMLAttributes<HTMLSpanElement> {
  trigger: React.ReactNode;
  items: MenuItem[];
  /** @default 'left' */
  align?: 'left' | 'right';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function Menu(props: MenuProps): JSX.Element;
