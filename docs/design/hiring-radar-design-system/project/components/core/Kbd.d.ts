import * as React from 'react';
export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}
/** A single mono keycap. Combine for chords. */
export function Kbd(props: KbdProps): JSX.Element;
