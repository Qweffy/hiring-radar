# Hiring Radar — Mission Control UI kit

A high-fidelity recreation of the primary product view: the job-hunt instrument that ingests the monthly Hacker News "Who is hiring?" thread, ranks every posting against your profile with hybrid semantic search, and runs an AI agent to shortlist roles.

## Files
- `index.html` — mounts the screen (loads `../../styles.css` + `../../_ds_bundle.js`).
- `MissionControl.jsx` — the full screen: glass topbar (logo, scan field, search-mode segmented control, Run sweep, avatar monogram), left nav + pipeline widget, the ranked **signal feed** of `JobRow`s, a right rail with the **live radar scope** + agent status, a posting **detail drawer**, and the ⌘K **command palette**.
- `RadarScope.jsx` — the radar panel: rings, 4s conic sweep, plotted blips (violet = AI-surfaced). Honors `prefers-reduced-motion`.

## Interactions to try
- **Run sweep** (or ⌘K → "Run sweep now") → indeterminate pipeline + success toast.
- Click any row → detail **drawer** (Esc closes, focus returns).
- Bookmark a row; dismiss the stale **banner**; switch tabs / search mode.
- **⌘K** opens the command palette (arrow keys + Enter; no-results falls through to posting search).

## Composition
Chrome (sidebar, topbar, radar) is local; everything else composes design-system primitives from `window.HiringRadarDesignSystem_e283cd` — `JobRow`, `Scorecard`, `ScoreGauge`, `StatusBadge`, `Tag`, `Tabs`, `SegmentedControl`, `SearchInput`, `Drawer`, `CommandPalette`, `Toast`, `Banner`, `ProgressLine`, `Menu`, `Tooltip`, `Button`, `IconButton`, `Icon`, `SectionLabel`, `Card`.
