import * as React from 'react';

/** On/off switch. Phosphor track + glowing knob when on. */
export interface ToggleProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Optional trailing label. */
  label?: React.ReactNode;
  id?: string;
  style?: React.CSSProperties;
}
export function Toggle(props: ToggleProps): JSX.Element;
