JobRow — one HN "Who is hiring" posting as a feed row: company, role, mono salary, location, stack tags, status badges, and a violet match gauge. Stack these to build the signal feed.

```jsx
<JobRow company="Cortex Labs" role="Staff Systems Engineer"
  salary="$210–250K" location="Remote (US)"
  tags={['Rust','Postgres','k8s']} badges={['NEW','REMOTE','VISA']}
  score={92} bookmarked onSelect={open} onBookmark={toggle} />
```

States: default, hover (border glows phosphor), `selected`, and `stale` (amber dot = edited since last sweep). `badges` accepts any `StatusValue`. Salary is always mono.
