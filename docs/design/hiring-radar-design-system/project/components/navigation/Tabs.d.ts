import * as React from 'react';

export interface TabItem {
  value: string;
  label: string;
  /** Optional mono count badge. */
  count?: number;
}

/** Filter tabs with mono counts and a phosphor underline indicator. */
export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}
export function Tabs(props: TabsProps): JSX.Element;
