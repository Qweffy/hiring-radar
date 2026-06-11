import React from 'react';
import { Modal } from './Modal.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';

/**
 * ConfirmModal — destructive-confirm variant. Red accent, restates the action
 * and object, destructive button on the RIGHT, Cancel focused by default.
 */
export function ConfirmModal({
  open, onCancel, onConfirm, title = 'Confirm', message,
  confirmLabel = 'Discard', cancelLabel = 'Cancel', confirmIcon = 'alert-triangle', tone = 'red',
}) {
  const cancelRef = React.useRef(null);
  React.useEffect(() => { if (open) setTimeout(() => cancelRef.current && cancelRef.current.focus(), 30); }, [open]);
  const c = tone === 'amber' ? 'var(--amber)' : 'var(--red)';

  return (
    <Modal
      open={open}
      onClose={onCancel}
      width={420}
      footer={(
        <>
          <span ref={cancelRef} tabIndex={-1} style={{ display: 'contents' }}>
            <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          </span>
          <Button variant="destructive" iconLeft={confirmIcon} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      <div style={{ display: 'flex', gap: 14 }}>
        <span style={{ flexShrink: 0, color: c, filter: `drop-shadow(0 0 8px ${c})` }}>
          <Icon name="alert-triangle" size={22} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h3 style={{ font: 'var(--text-h3)', color: 'var(--text-hi)' }}>{title}</h3>
          <p style={{ margin: 0, font: 'var(--text-sm)', color: 'var(--text-body)' }}>{message}</p>
        </div>
      </div>
    </Modal>
  );
}
