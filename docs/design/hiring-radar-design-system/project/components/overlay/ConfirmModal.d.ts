import * as React from 'react';
import { IconName } from '../core/Icon';

/**
 * Destructive-confirm dialog. Red accent, restates action + object, destructive
 * button on the right, Cancel focused by default. e.g. "Discard 2 dead letters?"
 */
export interface ConfirmModalProps {
  open: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: React.ReactNode;
  /** @default 'Discard' */
  confirmLabel?: string;
  /** @default 'Cancel' */
  cancelLabel?: string;
  confirmIcon?: IconName;
  /** @default 'red' */
  tone?: 'red' | 'amber';
}
export function ConfirmModal(props: ConfirmModalProps): JSX.Element;
