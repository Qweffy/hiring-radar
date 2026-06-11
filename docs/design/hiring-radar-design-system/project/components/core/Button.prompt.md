Button — the primary action control for triggering operations (run sweep, save, retry). Phosphor primary carries the glow; everything else stays restrained.

```jsx
<Button variant="primary" iconLeft="play">Run sweep</Button>
<Button variant="secondary">Filters</Button>
<Button variant="ghost" iconLeft="copy">Copy</Button>
<Button variant="destructive" iconLeft="alert-triangle">Discard</Button>
<Button variant="primary" loading>Scanning…</Button>
```

Variants: `primary` (phosphor fill + glow — one per view), `secondary` (outline), `ghost` (text), `destructive` (red outline). Sizes `sm | md | lg`. `loading` swaps in a spinner and disables. Add `iconLeft` / `iconRight` with an `IconName`.
