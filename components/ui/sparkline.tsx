import  { type SVGProps } from "react";

export type SparklineTone = "phosphor" | "violet" | "cyan";

export interface SparklineProps extends SVGProps<SVGSVGElement> {
  data: number[];
  width?: number;
  height?: number;
  /** @default 'phosphor' */
  tone?: SparklineTone;
}

const TONE_COLOR: Record<SparklineTone, string> = {
  phosphor: "var(--phosphor)",
  violet: "var(--violet)",
  cyan: "var(--cyan)",
};

/** Tiny inline trend line for scorecards. */
export function Sparkline({
  data,
  width = 72,
  height = 22,
  tone = "phosphor",
  style,
  ...rest
}: SparklineProps) {
  const color = TONE_COLOR[tone];

  if (data.length === 0) {
    return <svg width={width} height={height} style={style} aria-hidden="true" {...rest} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const denom = Math.max(1, data.length - 1);
  const points = data.map((v, i): [number, number] => {
    const x = (i / denom) * (width - 2) + 1;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return [x, y];
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) {
    return <svg width={width} height={height} style={style} aria-hidden="true" {...rest} />;
  }
  const area = `${line} L${last[0]},${height} L${first[0]},${height} Z`;

  // Deterministic (SSR-safe) gradient id: the gradient only depends on the
  // tone, so same-tone sparklines share an identical definition.
  const gradientId = `hr-spark-grad-${tone}`;

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", overflow: "visible", ...style }}
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={color} />
    </svg>
  );
}
