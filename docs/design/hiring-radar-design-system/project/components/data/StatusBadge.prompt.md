StatusBadge — a mono uppercase pill (sharp 4px corners) whose color, dot, and pulse derive from the status string. One component covers three families:

```jsx
<StatusBadge status="NEW" />        {/* posting attributes: NEW REMOTE ONSITE HYBRID VISA */}
<StatusBadge status="RUNNING" />    {/* process states: RUNNING COMPLETED FAILED PARTIAL RESUMED CANCELLED */}
<StatusBadge status="CRON" />       {/* triggers: CRON MANUAL BACKFILL */}
```

`NEW` shows a phosphor dot; `RUNNING` pulses. Override the text with `label` while keeping the status color.
