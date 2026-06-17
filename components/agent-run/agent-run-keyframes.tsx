/**
 * Page-scoped keyframes for the Agent Run screen, injected once via React's
 * deduped <style precedence>. Kept out of globals.css so they ship only with
 * this route. Every animation is disabled under prefers-reduced-motion.
 *
 *  - hr-dotping     LIVE indicator ping ring
 *  - hr-think       "Thinking…" dot on the live reasoning card
 *  - hr-livepulse   violet glow on the live reasoning card (.hr-livecard)
 *  - hr-orb-pulse   gentle pulse on the MatchPanel running orb
 *  - hr-shimmerbar  loading-skeleton bar sweep
 */
const KEYFRAMES = `
@keyframes hr-dotping {
  0% { transform: scale(1); opacity: 0.6; }
  80%, 100% { transform: scale(2.6); opacity: 0; }
}
.hr-dotr { animation: hr-dotping 1.8s var(--ease-out) infinite; }

@keyframes hr-think { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.hr-think { animation: hr-think 1.4s ease-in-out infinite; }

@keyframes hr-livepulse {
  0%, 100% { box-shadow: inset 3px 0 0 var(--violet), 0 0 0 rgba(167,139,250,0); }
  50% { box-shadow: inset 3px 0 0 var(--violet), 0 0 20px rgba(167,139,250,0.22); }
}
.hr-livecard { animation: hr-livepulse 1.8s ease-in-out infinite; }

@keyframes hr-orb-pulse-kf {
  0%, 100% { transform: scale(1); opacity: 0.92; }
  50% { transform: scale(1.06); opacity: 1; }
}
.hr-orb-pulse { animation: hr-orb-pulse-kf 2.2s ease-in-out infinite; }

@keyframes hr-shimmerbar { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.hr-shimmerbar {
  background: linear-gradient(90deg, rgba(147,164,179,0.06), rgba(61,255,162,0.10), rgba(147,164,179,0.06));
  background-size: 200% 100%;
  animation: hr-shimmerbar 1.4s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .hr-dotr, .hr-think, .hr-livecard, .hr-orb-pulse, .hr-shimmerbar { animation: none; }
}

/* Hover affordances for the agent-run interactive surfaces. */
.hr-decision-chip { transition: border-color var(--dur-fast) var(--ease-out); }
.hr-decision-chip:hover { border-color: var(--border-strong); }
.hr-pick-row { transition: border-color var(--dur-fast) var(--ease-out); }
.hr-pick-row:hover { border-color: var(--border-strong); }
.hr-history-row { transition: background var(--dur-fast) var(--ease-out); }
.hr-history-row:hover { background: var(--phosphor-08); }
.hr-violet-ghost { transition: background var(--dur-fast) var(--ease-out); }
.hr-violet-ghost:hover { background: var(--violet-12); }
.hr-violet-solid { transition: background var(--dur-fast) var(--ease-out); }
.hr-violet-solid:hover { background: #b9a2ff; }
`;

/** Injects the Agent Run keyframes once (deduped by href across the tree). */
export function AgentRunKeyframes() {
  return (
    <style href="hr-agent-run-keyframes" precedence="default">
      {KEYFRAMES}
    </style>
  );
}
