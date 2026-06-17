import { gaugeOffset } from "@/components/shortlist/view-model";

export interface MatchGaugeProps {
  /** Match score 0–100. */
  match: number;
  /** Outer box size in px. @default 54 */
  size?: number;
}

const GEOMETRY_DEFAULT = { r: 24, circ: 150.8, font: 15 };

const GEOMETRY: Record<number, { r: number; circ: number; font: number }> = {
  54: GEOMETRY_DEFAULT,
  48: { r: 21, circ: 131.9, font: 14 },
};

/**
 * Radial match gauge — always violet (the AI score color), regardless of stage.
 * Starts at 12 o'clock (rotate -90deg); a higher match fills more of the arc.
 */
export function MatchGauge({ match, size = 54 }: MatchGaugeProps) {
  const geo = GEOMETRY[size] ?? GEOMETRY_DEFAULT;
  const center = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={center}
          cy={center}
          r={geo.r}
          fill="none"
          stroke="rgba(167,139,250,0.16)"
          strokeWidth={5}
        />
        <circle
          cx={center}
          cy={center}
          r={geo.r}
          fill="none"
          stroke="var(--violet)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={geo.circ}
          strokeDashoffset={gaugeOffset(match, geo.circ)}
          style={{ filter: "drop-shadow(0 0 5px rgba(167,139,250,0.45))" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          font: `600 ${geo.font}px/1 var(--font-mono)`,
          color: "var(--text-hi)",
        }}
      >
        {match}
      </div>
    </div>
  );
}
