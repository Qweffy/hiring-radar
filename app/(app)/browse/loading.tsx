import { Skeleton } from "@/components/ui/skeleton";

const CHIP_WIDTHS = [86, 78, 72, 68, 60, 92];

/** Toolbar chrome + skeleton rows while the first browse query resolves. */
export default function BrowseLoading() {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Toolbar chrome — same frame as the live toolbar */}
      <div
        className="relative z-20 shrink-0"
        style={{
          padding: "16px 24px 14px",
          background: "var(--glass)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--divider)",
        }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <div
            className="hr-skeleton"
            style={{ flex: 1, height: "var(--control-h-lg)", borderRadius: "var(--radius-control)" }}
          />
          <div
            className="hr-skeleton shrink-0"
            style={{ width: 188, height: 28, borderRadius: "var(--radius-control)" }}
          />
        </div>
        <div className="flex items-center" style={{ gap: 10, marginTop: 14 }}>
          {CHIP_WIDTHS.map((w, i) => (
            <div
              key={i}
              className="hr-skeleton shrink-0"
              style={{ width: w, height: 30, borderRadius: "var(--radius-control)" }}
            />
          ))}
          <div className="flex-1" />
          <div
            className="hr-skeleton shrink-0"
            style={{ width: 140, height: 12 }}
          />
        </div>
      </div>

      {/* Results — 8 skeleton rows, list never renders blank chrome */}
      <div className="min-h-0 flex-1 overflow-hidden" style={{ padding: "18px 24px" }}>
        <div className="flex flex-col" style={{ gap: 10 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} variant="row" />
          ))}
        </div>
      </div>
    </div>
  );
}
