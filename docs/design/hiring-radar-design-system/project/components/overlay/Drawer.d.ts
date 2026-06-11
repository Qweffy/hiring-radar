import * as React from 'react';

/** Side panel sliding in from the right/left. Esc closes; focus trapped. */
export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** @default 'right' */
  side?: 'right' | 'left';
  /** Width in px. @default 440 */
  width?: number;
}
export function Drawer(props: DrawerProps): JSX.Element;
