import React from 'react';
import { Button } from '../core/Button.jsx';
import { HRIllustration } from './EmptyState.jsx';

/**
 * ErrorState — recovery-oriented error. ALWAYS shows a recovery action and a
 * plain-language cause, never a stack trace. `compact` (inline/widget) drops the
 * illustration to STATIC INTERFERENCE or none; full uses LOST SIGNAL.
 */
export function ErrorState({
  cause = "Couldn't reach the database",
  detail, tone = 'red', onRetry, retryLabel = 'Retry',
  compact = false, hideIllustration = false, style, ...rest
}) {
  const illo = compact ? 'static-interference' : 'lost-signal';
  return (
    <div
      role="alert"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        gap: 6, padding: compact ? '20px 16px' : '40px 24px', maxWidth: compact ? 320 : 400, margin: '0 auto',
        ...style,
      }}
      {...rest}
    >
      {!hideIllustration && (
        <div style={{ marginBottom: compact ? 10 : 14 }}>
          <HRIllustration name={illo} size={compact ? 84 : 116} />
        </div>
      )}
      <h3 style={{ font: compact ? 'var(--text-base)' : 'var(--text-h3)', color: 'var(--text-hi)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
        {cause}
      </h3>
      {detail && <p style={{ margin: 0, font: 'var(--text-sm)', color: 'var(--text-body)' }}>{detail}</p>}
      <div style={{ marginTop: 14 }}>
        <Button variant="secondary" iconLeft="retry" onClick={onRetry}>{retryLabel}</Button>
      </div>
    </div>
  );
}
