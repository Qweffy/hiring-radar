const MNS = window.HiringRadarDesignSystem_e283cd;
const {
  Button, IconButton, Icon, Kbd, SectionLabel, Card,
  SearchInput, SegmentedControl, Tabs,
  Tag, StatusBadge, ScoreGauge, Scorecard,
  Toast, Banner, Drawer, CommandPalette, Menu, ProgressLine, Tooltip,
} = MNS;

const POSTINGS = [
  { id: 'cortex', company: 'Cortex Labs', role: 'Staff Systems Engineer', salary: '$210–250K', location: 'Remote (US)', tags: ['Rust', 'Postgres', 'k8s'], badges: ['NEW', 'REMOTE', 'VISA'], score: 92, x: 64, y: 32, ai: false,
    why: 'Strong overlap on Rust + distributed systems. Comp above your $180K floor. Remote-friendly with visa support.' },
  { id: 'helio', company: 'Helio', role: 'Senior Backend Engineer', salary: '$180–220K', location: 'NYC · Hybrid', tags: ['Go', 'gRPC', 'Kafka'], badges: ['NEW', 'HYBRID'], score: 78, x: 40, y: 58, ai: true,
    why: 'Go + event-streaming match your recent work. Hybrid in NYC — confirm your location preference.' },
  { id: 'drift', company: 'Driftwood', role: 'Platform Engineer', salary: '$160–190K', location: 'Remote (EU)', tags: ['Python', 'AWS', 'Terraform'], badges: ['REMOTE'], score: 61, x: 30, y: 36, ai: false,
    why: 'Infra-heavy. Comp slightly below target; EU timezone overlaps partially.', stale: true },
  { id: 'lumen', company: 'Lumen Systems', role: 'Senior SRE', salary: '$190–230K', location: 'Remote (Global)', tags: ['Go', 'Prometheus', 'k8s'], badges: ['REMOTE', 'VISA'], score: 71, x: 72, y: 64, ai: true,
    why: 'Reliability focus aligns with your on-call experience. Global remote is a plus.' },
  { id: 'arbor', company: 'Arbor', role: 'Backend Engineer', salary: '$150–180K', location: 'Austin · Onsite', tags: ['Node', 'GraphQL'], badges: ['ONSITE'], score: 38, x: 52, y: 22, ai: false,
    why: 'Onsite in Austin conflicts with your remote preference; stack is a partial match.' },
];

function NavItem({ icon, label, count, active, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', border: 'none', cursor: 'pointer', textAlign: 'left',
        borderRadius: 'var(--radius-control)',
        background: active ? 'var(--phosphor-12)' : hover ? 'rgba(147,164,179,0.07)' : 'transparent',
        color: active ? 'var(--phosphor)' : 'var(--text-body)',
        borderLeft: active ? '2px solid var(--phosphor)' : '2px solid transparent', font: 'var(--text-sm)' }}>
      <Icon name={icon} size={18} />
      <span style={{ flex: 1 }}>{label}</span>
      {count != null && <span style={{ font: 'var(--mono-sm)', color: active ? 'var(--phosphor)' : 'var(--text-low-content)' }}>{count}</span>}
    </button>
  );
}

function MissionControl() {
  const [q, setQ] = React.useState('');
  const [mode, setMode] = React.useState('hybrid');
  const [tab, setTab] = React.useState('new');
  const [nav, setNav] = React.useState('feed');
  const [sel, setSel] = React.useState(null);
  const [saved, setSaved] = React.useState({ cortex: true });
  const [palette, setPalette] = React.useState(false);
  const [banner, setBanner] = React.useState(true);
  const [sweeping, setSweeping] = React.useState(false);
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function pushToast(t) {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 5000);
  }
  function runSweep() {
    setSweeping(true);
    setTimeout(() => { setSweeping(false); pushToast({ tone: 'success', title: 'Sweep complete', message: '5 new roles ingested.' }); }, 2600);
  }

  const filtered = POSTINGS.filter((p) => !q || (p.company + p.role + p.tags.join(' ')).toLowerCase().includes(q.toLowerCase()));
  const selected = POSTINGS.find((p) => p.id === sel);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', zIndex: 1 }}>
      {/* TOPBAR */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', height: 'var(--topbar-h)', flexShrink: 0,
        background: 'var(--glass)', backdropFilter: 'blur(var(--blur-glass))', WebkitBackdropFilter: 'blur(var(--blur-glass))', borderBottom: '1px solid var(--border)' }}>
        <img src="../../assets/logo.svg" alt="Hiring Radar" style={{ height: 24 }} />
        <div style={{ flex: 1, maxWidth: 460, marginLeft: 8 }}>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="scan postings…" />
        </div>
        <SegmentedControl size="sm" value={mode} onChange={setMode} options={[{ value: 'semantic', label: 'Sem', icon: 'bot' }, { value: 'keyword', label: 'Key', icon: 'search' }, { value: 'hybrid', label: 'Hybrid', icon: 'zap' }]} />
        <div style={{ flex: 1 }} />
        <Tooltip label="Scans the latest “Who is hiring” thread"><Button variant="primary" size="sm" iconLeft={sweeping ? undefined : 'play'} loading={sweeping} onClick={runSweep}>{sweeping ? 'Sweeping' : 'Run sweep'}</Button></Tooltip>
        <IconButton icon="bell" label="Alerts" />
        <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-control)', background: 'var(--bg-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 11px/1 var(--font-mono)', color: 'var(--phosphor)' }}>NM</div>
      </header>

      {banner && <Banner tone="amber" action actionLabel="Re-run" onClose={() => setBanner(false)}>Last sweep is 31h old — data may be stale.</Banner>}

      {/* BODY */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'var(--sidebar-w) 1fr 320px', minHeight: 0 }}>
        {/* SIDEBAR */}
        <aside style={{ borderRight: '1px solid var(--divider)', padding: 14, display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg-surface)' }}>
          <div style={{ padding: '4px 10px 10px' }}><SectionLabel>Navigation</SectionLabel></div>
          <NavItem icon="list" label="Signal feed" count={312} active={nav === 'feed'} onClick={() => setNav('feed')} />
          <NavItem icon="bookmark" label="Saved" count={Object.values(saved).filter(Boolean).length} active={nav === 'saved'} onClick={() => setNav('saved')} />
          <NavItem icon="bot" label="Agent runs" count={4} active={nav === 'agent'} onClick={() => setNav('agent')} />
          <NavItem icon="database" label="Sources" active={nav === 'sources'} onClick={() => setNav('sources')} />
          <div style={{ flex: 1 }} />
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--bg-raised)' }}>
            <SectionLabel icon="signal" tone="phosphor">Pipeline</SectionLabel>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--mono-sm)', color: 'var(--text-mid)' }}><span>Ingested</span><span style={{ color: 'var(--text-hi)' }}>312</span></div>
              <ProgressLine value={sweeping ? undefined : 100} indeterminate={sweeping} />
              <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--mono-sm)', color: 'var(--text-mid)' }}><span>Agent matched</span><span style={{ color: 'var(--violet)' }}>47</span></div>
              <ProgressLine value={47 / 312 * 100} tone="violet" />
            </div>
          </div>
          <NavItem icon="settings" label="Settings" active={nav === 'settings'} onClick={() => setNav('settings')} />
        </aside>

        {/* MAIN */}
        <main style={{ overflow: 'auto', padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <Scorecard label="New roles" value={47} delta={12} spark={[3, 5, 4, 7, 6, 9, 8, 12]} />
            <Scorecard label="Avg match" value={71} suffix="/100" tone="violet" spark={[60, 62, 58, 66, 70, 68, 71]} />
            <Scorecard label="Shortlisted" value={9} tone="cyan" spark={[2, 3, 3, 5, 6, 7, 9]} />
            <Scorecard label="Applied" value={3} spark={[0, 1, 1, 2, 2, 3, 3]} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: 312 }, { value: 'new', label: 'New', count: 47 }, { value: 'saved', label: 'Saved', count: 9 }, { value: 'applied', label: 'Applied', count: 3 }]} />
            <Menu align="right" trigger={<Button variant="ghost" size="sm" iconLeft="filter" iconRight="chevron-down">Sort</Button>} items={[
              { label: 'Match score', icon: 'check' }, { label: 'Salary', icon: 'arrow-right' }, { label: 'Newest', icon: 'clock' },
            ]} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((p) => (
              <JobRowLite key={p.id} p={p} selected={sel === p.id} bookmarked={!!saved[p.id]}
                onSelect={() => setSel(p.id)} onBookmark={() => setSaved((s) => ({ ...s, [p.id]: !s[p.id] }))} />
            ))}
          </div>
        </main>

        {/* RIGHT — radar + status */}
        <aside style={{ borderLeft: '1px solid var(--divider)', padding: 18, overflow: 'auto', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <SectionLabel tone="phosphor" icon="radar">Live scope</SectionLabel>
            <span style={{ font: 'var(--mono-sm)', color: 'var(--text-low-content)' }}>06:00 UTC</span>
          </div>
          <RadarScope size={232} blips={POSTINGS.map((p) => ({ x: p.x, y: p.y, ai: p.ai }))} />
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Card variant="flush" padding={false}>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel icon="bot" tone="violet">Agent status</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><StatusBadge status="RUNNING" /><span style={{ font: 'var(--text-sm)', color: 'var(--text-body)' }}>Shortlisting 312 postings</span></div>
                <ProgressLine indeterminate tone="violet" />
              </div>
            </Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <span style={{ font: 'var(--mono-sm)', color: 'var(--text-low-content)' }}>NEXT SWEEP</span>
              <span style={{ font: 'var(--mono-sm)', color: 'var(--text-mid)' }}>in 5h 12m · CRON</span>
            </div>
          </div>
        </aside>
      </div>

      {/* DETAIL DRAWER */}
      <Drawer open={!!selected} onClose={() => setSel(null)} title={selected ? `${selected.company} · ${selected.role}` : ''}
        footer={selected && <><Button variant="ghost" iconLeft="external-link">Open thread</Button><Button variant="primary" iconLeft="bookmark" onClick={() => { setSaved((s) => ({ ...s, [selected.id]: true })); pushToast({ tone: 'success', title: 'Saved to shortlist' }); setSel(null); }}>Save to shortlist</Button></>}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <ScoreGauge score={selected.score} size={72} label="Match" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ font: 'var(--mono-lg)', color: 'var(--phosphor)' }}>{selected.salary}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: 'var(--mono-sm)', color: 'var(--text-low-content)' }}><Icon name="map-pin" size={13} />{selected.location}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{selected.badges.map((b) => <StatusBadge key={b} status={b} />)}</div>
              </div>
            </div>
            <div>
              <SectionLabel icon="bot" tone="violet">Why the agent surfaced this</SectionLabel>
              <p style={{ margin: '10px 0 0', font: 'var(--text-base)', color: 'var(--text-body)' }}>{selected.why}</p>
            </div>
            <div>
              <SectionLabel>Stack</SectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{selected.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
            </div>
          </div>
        )}
      </Drawer>

      <CommandPalette open={palette} onClose={() => setPalette(false)} onSelect={(it) => { setPalette(false); if (it.id === 'run') runSweep(); }} onSearchFallback={() => setPalette(false)} groups={[
        { label: 'Actions', items: [{ id: 'run', label: 'Run sweep now', icon: 'play', hint: '⌘↵' }, { id: 'agent', label: 'Ask agent to shortlist', icon: 'bot' }, { id: 'export', label: 'Export shortlist', icon: 'external-link' }] },
        { label: 'Navigate', items: [{ id: 'feed', label: 'Open signal feed', icon: 'list', hint: 'G F' }, { id: 'saved', label: 'Saved roles', icon: 'bookmark', hint: 'G S' }, { id: 'settings', label: 'Settings', icon: 'settings' }] },
      ]} />

      {ReactDOM.createPortal(
        <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 'var(--z-toast)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {toasts.map((t) => <Toast key={t.id} tone={t.tone} title={t.title} message={t.message} onClose={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} />)}
        </div>, document.body)}
    </div>
  );
}

// Local lite row using the bundled JobRow
function JobRowLite({ p, selected, bookmarked, onSelect, onBookmark }) {
  return (
    <MNS.JobRow company={p.company} role={p.role} salary={p.salary} location={p.location}
      tags={p.tags} badges={p.badges} score={p.score} selected={selected} stale={p.stale}
      bookmarked={bookmarked} onSelect={onSelect} onBookmark={onBookmark} />
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<MissionControl />);
