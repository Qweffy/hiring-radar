/**
 * Page-local keyframes for the Shortlist, registered once via React's hoistable
 * <style> (deduped by href). Mirrors the design's <style> block: the live-run
 * progress sweep, the streaming ping, the revert shake, and the skeleton
 * shimmer. All are stilled under prefers-reduced-motion.
 */
const CSS = `
@keyframes hr-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes hr-sl-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes hr-shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }
@keyframes hr-ping2 { 0% { transform: scale(0.6); opacity: 0.7; } 80%, 100% { transform: scale(2.4); opacity: 0; } }
@keyframes hr-orb-pulse-kf { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.82; } }
.hr-orb-pulse { animation: hr-orb-pulse-kf 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .hr-prog, .hr-ping2, .hr-sl-skel, .hr-sl-shake, .hr-orb-pulse { animation: none !important; }
}
`;

export function ShortlistStyles() {
  return (
    <style href="hr-shortlist" precedence="medium">
      {CSS}
    </style>
  );
}
