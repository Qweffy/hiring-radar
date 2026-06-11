Scorecard — a dashboard metric tile: mono uppercase label, big mono number that counts up on mount, optional signed delta vs last sweep, and an optional sparkline. The atom of the mission-control header.

```jsx
<Scorecard label="New roles" value={47} delta={12} spark={[3,5,4,7,6,9,8,12]} />
<Scorecard label="Avg match" value={71} suffix="/100" tone="violet" spark={trend} />
```

Tones: `phosphor` (default), `violet` (AI metrics), `cyan`. Count-up degrades to static under reduced-motion.
