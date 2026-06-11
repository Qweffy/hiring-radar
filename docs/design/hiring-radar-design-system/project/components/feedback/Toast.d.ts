import * as React from 'react';

/**
 * Transient notification on glass. Tones success/error/warning/info, plus
 * action variants: `retry`, and undo with a mono countdown.
 */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default 'info' */
  tone?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message?: React.ReactNode;
  /** Built-in action: 'retry' shows a Retry button. */
  action?: 'retry' | string;
  actionLabel?: string;
  onAction?: () => void;
  /** When set, shows "Undo (Ns)" with a live countdown. */
  undoSeconds?: number;
  onUndo?: () => void;
  onClose?: () => void;
}
export function Toast(props: ToastProps): JSX.Element;
