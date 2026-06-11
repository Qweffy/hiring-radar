import * as React from 'react';

/** Tiny inline trend line for scorecards. */
export interface SparklineProps extends React.SVGProps<SVGSVGElement> {
  data: number[];
  width?: number;
  height?: number;
  /** @default 'phosphor' */
  tone?: 'phosphor' | 'violet' | 'cyan';
}
export function Sparkline(props: SparklineProps): JSX.Element;
