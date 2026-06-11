import * as React from 'react';

/** Single-value range slider with phosphor track and mono readout. */
export interface RangeSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  /** Formats the readout, e.g. v => `$${v}k`. */
  format?: (v: number) => React.ReactNode;
}
export function RangeSlider(props: RangeSliderProps): JSX.Element;
