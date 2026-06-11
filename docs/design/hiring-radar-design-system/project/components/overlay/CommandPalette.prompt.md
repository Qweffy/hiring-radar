CommandPalette — the ⌘K command surface: glass panel, mono input, grouped + filterable results with arrow-key nav. Its no-results state falls through to posting search ("Enter to search postings instead").

```jsx
<CommandPalette open={open} onClose={close} onSelect={run} onSearchFallback={search}
  groups={[
    { label: 'Actions', items: [{ id:'run', label:'Run sweep now', icon:'play', hint:'⌘↵' }] },
    { label: 'Navigate', items: [{ id:'feed', label:'Open signal feed', icon:'list', hint:'G F' }] },
  ]} />
```

Wire ⌘K / Ctrl-K yourself to set `open`. Esc closes; ↑/↓ move; Enter selects (or fires `onSearchFallback` when empty).
