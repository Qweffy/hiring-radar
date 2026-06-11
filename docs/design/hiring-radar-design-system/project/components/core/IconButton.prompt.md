IconButton — square icon-only control for toolbars and row actions (kebab, copy, retry, bookmark). Always supply `label` for screen readers and the tooltip.

```jsx
<IconButton icon="kebab" label="More actions" />
<IconButton icon="bookmark" label="Save" active />
<IconButton icon="play" label="Run sweep" variant="solid" />
<IconButton icon="retry" label="Retry" loading />
```

Variants: `ghost` (default), `solid` (phosphor, glows), `danger`. Use `active` for toggled state.
