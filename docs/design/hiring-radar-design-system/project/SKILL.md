---
name: hiring-radar-design
description: Use this skill to generate well-branded interfaces and assets for Hiring Radar, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. The aesthetic is military-radar / mission-control / Bloomberg-terminal: dark-only, phosphor glow on near-black, data-dense, all numbers in mono.
user-invocable: true
---

# Hiring Radar — design skill

Read `readme.md` in this skill first — it is the full design guide (hard rules, content fundamentals, visual foundations, iconography, and the file index). Then explore the other files.

## Foundation
- Link `styles.css` (or copy `tokens/*.css` + the Google Fonts `@import` from `tokens/typography.css`). Every artifact starts from the `:root` token block — the copyable version is at the bottom of `Style Guide.html`.
- Put `.hr-void` on the page background for the dot-grid + scanline texture.

## Building artifacts
- **Throwaway visuals (slides, mocks, prototypes):** copy the assets you need out of `assets/`, link `styles.css`, and write static HTML. For React components, load `_ds_bundle.js` and read from `window.HiringRadarDesignSystem_e283cd` (see any `*.card.html` for the exact pattern). Use real icons via the `Icon` component or `assets/lucide-icons.js` (`hrIcon(name, size)`) — never emoji, never hand-drawn SVG icons.
- **Production code (Next.js):** read the token files and component `.d.ts` / `.prompt.md` contracts to design accurately with the brand. Lift exact hex/spacing/radii values; reuse component prop shapes.

## Non-negotiables (see readme for the full list)
- Dark only. Phosphor `#3DFFA2` is the one hero accent. Violet = AI/agent.
- All numeric data (salaries, counts, scores, timestamps) renders in **JetBrains Mono**.
- No emoji, no gradients (except phosphor glows + the radar conic sweep), no radius > 10px, no pills, no centered marketing-hero layouts.
- **Illustrations:** use ONLY the 14 named SVGs in `assets/illustrations/` (see `SVG Asset Pack.html`) — `empty-radar`, `lonely-blip`, `lost-signal`, `off-the-grid`, `agent-orb-idle/active`, `flatline-calibration`, `clean-signal`, `static-interference`, `blip-sprite`, `loading-sweep`, `mark`, `favicon`, `wordmark`. Never draw new illustrations or pull from an illustration library.
- Honor `prefers-reduced-motion`; keep visible phosphor focus rings.

## If invoked with no brief
Ask what the user wants to build or design, ask a few focused questions (surface: product screen vs. marketing vs. slides; scope; states needed), then act as an expert Hiring Radar designer who outputs HTML artifacts **or** production code depending on the need.
