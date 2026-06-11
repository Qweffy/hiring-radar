import * as React from 'react';

/**
 * Centered dialog on a blurred scrim. Esc closes, focus trapped, focus returns
 * to trigger on close. Backdrop click closes.
 */
export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Footer node (usually right-aligned buttons). */
  footer?: React.ReactNode;
  /** Panel width in px. @default 460 */
  width?: number;
}
export function Modal(props: ModalProps): JSX.Element;
