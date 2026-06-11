const NS = window.HiringRadarDesignSystem_e283cd;
// If the compiled bundle is missing, the standalone script in Style Guide.html
// has already shown a fallback in #app; bail out before destructuring.
if (NS) {
const {
  Button, IconButton, Icon, Kbd, SectionLabel, Card,
  Input, SearchInput, Select, RangeSlider, Toggle,
  Tabs, SegmentedControl, ProgressLine,
  Tag, StatusBadge, MatchBadge, ScoreGauge, Scorecard, Sparkline, JobRow,
  Toast, Banner, Skeleton, EmptyState, ErrorState, Tooltip,
  Menu, Modal, ConfirmModal, Drawer, CommandPalette,
} = NS;

const ICONS = ['search','radar','list','bookmark','bot','user','server','settings','play','pause','retry','external-link','copy','kebab','filter','close','check','alert-triangle','chevron-down','command','map-pin','clock','x-circle','arrow-right','bell','signal','zap','database','info','inbox','sliders','chevron-right'];

function Section({ label, title, sub, children }) {
  return (
    <section>
      <p className="seclbl">{label}</p>
      <h2 className="sec">{title}</h2>
      {sub && <p className="secsub">{sub}</p>}
      {children}
    </section>
  );
}
function Grp({ label, children, style }) {
  return (
    <div className="grp" style={style}>
      <div className="grplbl">{label}</div>
      {children}
    </div>
  );
}

function App() {
  const [q, setQ] = React.useState('staff rust remote');
  const [sal, setSal] = React.useState(180);
  const [remote, setRemote] = React.useState(true);
  const [visa, setVisa] = React.useState(false);
  const [tab, setTab] = React.useState('new');
  const [mode, setMode] = React.useState('hybrid');
  const [sel, setSel] = React.useState('helio');
  const [saved, setSaved] = React.useState({ helio: true });
  const [modal, setModal] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const [palette, setPalette] = React.useState(false);
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function pushToast(t) {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 5200);
  }

  return (
    <React.Fragment>
      {/* TYPE & ICONS */}
      <Section label="Foundation" title="Type & iconography" sub="Space Grotesk display · Inter UI · JetBrains Mono for all data. One Lucide-style stroke set at 1.5px.">
        <Grp label="Type ramp">
          <div className="col" style={{ gap: 10 }}>
            <span style={{ font: 'var(--text-display)', color: 'var(--text-hi)', letterSpacing: 'var(--tracking-display)' }}>Scanning the market</span>
            <span style={{ font: 'var(--text-h2)', color: 'var(--text-hi)' }}>Cortex Labs · Staff Engineer</span>
            <span style={{ font: 'var(--text-base)', color: 'var(--text-body)' }}>Hybrid semantic search ranks every posting against your profile.</span>
            <span style={{ font: 'var(--mono-lg)', color: 'var(--phosphor)' }}>$210–250K · match=0.92 · 06:00 UTC</span>
          </div>
        </Grp>
        <Grp label="Icon set">
          <div className="iconrow">
            {ICONS.map((n) => <div key={n}><Icon name={n} size={20} /><span className="nm">{n}</span></div>)}
          </div>
        </Grp>
      </Section>

      {/* BUTTONS */}
      <Section label="Components" title="Buttons" sub="Phosphor primary carries the glow. One primary per view.">
        <Grp label="Variants"><div className="row">
          <Button variant="primary" iconLeft="play">Run sweep</Button>
          <Button variant="secondary" iconLeft="filter">Filters</Button>
          <Button variant="ghost" iconLeft="copy">Copy</Button>
          <Button variant="destructive" iconLeft="alert-triangle">Discard</Button>
        </div></Grp>
        <Grp label="States"><div className="row">
          <Button variant="primary" loading>Scanning</Button>
          <Button variant="secondary" disabled>Disabled</Button>
          <Button variant="primary" size="lg" iconRight="arrow-right">Large</Button>
          <Button variant="secondary" size="sm">Small</Button>
        </div></Grp>
        <Grp label="Icon buttons" style={{ marginBottom: 0 }}><div className="row">
          <IconButton icon="play" label="Run" variant="solid" />
          <IconButton icon="bookmark" label="Save" active />
          <IconButton icon="kebab" label="More" />
          <IconButton icon="retry" label="Retry" loading />
          <IconButton icon="close" label="Close" variant="danger" />
          <IconButton icon="settings" label="Settings" disabled />
          <span style={{ display: 'inline-flex', gap: 4, marginLeft: 10 }}><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </div></Grp>
      </Section>

      {/* INPUTS */}
      <Section label="Components" title="Inputs & controls" sub="Mono placeholders for data fields. Focus glows phosphor; errors glow red.">
        <div className="grid2">
          <Grp label="Search & text"><div className="col">
            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
            <Input value="ada@lovelace.dev" onChange={() => {}} icon="user" />
            <Input value="not-an-email" onChange={() => {}} error="Enter a valid email" />
          </div></Grp>
          <Grp label="Select, slider, toggles"><div className="col">
            <Select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="semantic">Semantic search</option>
              <option value="keyword">Keyword</option>
              <option value="hybrid">Hybrid</option>
            </Select>
            <RangeSlider value={sal} onChange={(e) => setSal(+e.target.value)} min={80} max={400} step={5} label="Min base salary" format={(v) => '$' + v + 'K'} />
            <div className="row" style={{ gap: 24 }}>
              <Toggle checked={remote} onChange={setRemote} label="Remote only" />
              <Toggle checked={visa} onChange={setVisa} label="Visa sponsor" />
            </div>
          </div></Grp>
        </div>
        <Grp label="Tabs · segmented · progress" style={{ marginTop: 8, marginBottom: 0 }}>
          <div className="col" style={{ gap: 18 }}>
            <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All roles', count: 312 }, { value: 'new', label: 'New', count: 47 }, { value: 'saved', label: 'Saved', count: 9 }, { value: 'applied', label: 'Applied', count: 3 }]} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <SegmentedControl value={mode} onChange={setMode} options={[{ value: 'semantic', label: 'Semantic', icon: 'bot' }, { value: 'keyword', label: 'Keyword', icon: 'search' }, { value: 'hybrid', label: 'Hybrid', icon: 'zap' }]} />
              <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ProgressLine value={72} />
                <ProgressLine indeterminate tone="violet" />
              </div>
            </div>
          </div>
        </Grp>
      </Section>

      {/* DATA */}
      <Section label="Components" title="Tags, badges, match score" sub="Status drives color. Match strength = violet opacity; the gauge counts up on mount.">
        <Grp label="Status · attributes / process / triggers"><div className="row">
          <StatusBadge status="NEW" /><StatusBadge status="REMOTE" /><StatusBadge status="ONSITE" /><StatusBadge status="HYBRID" /><StatusBadge status="VISA" />
          <span style={{ width: 1, height: 18, background: 'var(--divider)' }} />
          <StatusBadge status="RUNNING" /><StatusBadge status="COMPLETED" /><StatusBadge status="FAILED" /><StatusBadge status="PARTIAL" /><StatusBadge status="RESUMED" /><StatusBadge status="CANCELLED" />
          <span style={{ width: 1, height: 18, background: 'var(--divider)' }} />
          <StatusBadge status="CRON" /><StatusBadge status="MANUAL" /><StatusBadge status="BACKFILL" />
        </div></Grp>
        <Grp label="Stack tags · filter chips · match · gauge" style={{ marginBottom: 0 }}><div className="row">
          <Tag>Rust</Tag><Tag>k8s</Tag><Tag tone="cyan">Postgres</Tag>
          <Tag tone="phosphor" onRemove={() => {}}>remote</Tag>
          <Tag tone="violet" icon="bot" onRemove={() => {}}>AI-matched</Tag>
          <span style={{ width: 1, height: 18, background: 'var(--divider)' }} />
          <MatchBadge level="HIGH" score={92} /><MatchBadge level="MED" score={64} /><MatchBadge level="LOW" score={31} />
          <span style={{ width: 1, height: 18, background: 'var(--divider)' }} />
          <ScoreGauge score={92} size={56} label="Match" />
          <ScoreGauge score={64} size={56} />
        </div></Grp>
      </Section>

      {/* CARDS */}
      <Section label="Components" title="Cards & scorecards" sub="The dashboard atoms. Big mono numbers count up; sparklines trace the last few sweeps.">
        <div className="grid3" style={{ marginBottom: 22 }}>
          <Scorecard label="New roles" value={47} delta={12} spark={[3,5,4,7,6,9,8,12]} />
          <Scorecard label="Avg match" value={71} suffix="/100" tone="violet" spark={[60,62,58,66,70,68,71]} />
          <Scorecard label="Shortlisted" value={9} tone="cyan" spark={[2,3,3,5,6,7,9]} />
        </div>
        <div className="grid2">
          <Card header="Posting · Cortex Labs">
            <div className="col" style={{ gap: 10 }}>
              <span style={{ font: 'var(--text-h3)', color: 'var(--text-hi)' }}>Staff Systems Engineer</span>
              <span style={{ font: 'var(--mono-base)', color: 'var(--phosphor)' }}>$210–250K · Remote (US)</span>
              <div className="row"><Tag>Rust</Tag><Tag>Postgres</Tag><StatusBadge status="VISA" /></div>
            </div>
          </Card>
          <Card variant="glass" header="Glass overlay" actions={<IconButton icon="close" label="Close" size="sm" />}>
            <span style={{ font: 'var(--text-sm)', color: 'var(--text-body)' }}>Glass surfaces sit over the radar for sticky bars, popovers, and the command palette.</span>
          </Card>
        </div>
      </Section>

      {/* JOB ROWS */}
      <Section label="Components" title="Job rows" sub="Default · hover (border glows) · selected · stale (amber dot). The signal feed is a stack of these.">
        <div className="col" style={{ gap: 8 }}>
          <JobRow company="Cortex Labs" role="Staff Systems Engineer" salary="$210–250K" location="Remote (US)" tags={['Rust','Postgres','k8s']} badges={['NEW','REMOTE','VISA']} score={92} selected={sel === 'cortex'} bookmarked={saved.cortex} onSelect={() => setSel('cortex')} onBookmark={() => setSaved((s) => ({ ...s, cortex: !s.cortex }))} />
          <JobRow company="Helio" role="Senior Backend Engineer" salary="$180–220K" location="NYC · Hybrid" tags={['Go','gRPC']} badges={['HYBRID']} score={64} selected={sel === 'helio'} bookmarked={saved.helio} onSelect={() => setSel('helio')} onBookmark={() => setSaved((s) => ({ ...s, helio: !s.helio }))} />
          <JobRow company="Driftwood" role="Platform Engineer" salary="$160–190K" location="Remote (EU)" tags={['Python','AWS','Terraform']} badges={['REMOTE']} score={48} stale selected={sel === 'drift'} bookmarked={saved.drift} onSelect={() => setSel('drift')} onBookmark={() => setSaved((s) => ({ ...s, drift: !s.drift }))} />
        </div>
      </Section>

      {/* FEEDBACK */}
      <Section label="Components" title="Toasts & banners" sub="Toasts live on glass with retry / undo-countdown actions. Banners span under the topbar in three tones.">
        <Grp label="Trigger a toast"><div className="row">
          <Button variant="secondary" onClick={() => pushToast({ tone: 'success', title: 'Sweep complete', message: '47 new roles ingested.' })}>Success</Button>
          <Button variant="secondary" onClick={() => pushToast({ tone: 'error', title: 'Ingestion failed', message: "Couldn't reach the HN API.", action: 'retry' })}>Error · Retry</Button>
          <Button variant="secondary" onClick={() => pushToast({ tone: 'warning', title: 'Removed from shortlist', undoSeconds: 8 })}>Warning · Undo</Button>
          <Button variant="secondary" onClick={() => pushToast({ tone: 'info', title: 'Agent queued', message: 'Shortlisting 312 postings…' })}>Info</Button>
        </div></Grp>
        <Grp label="Banners" style={{ marginBottom: 0 }}>
          <div className="panel"><div className="col" style={{ gap: 0 }}>
            <Banner tone="amber" action actionLabel="Re-run">Last sweep is 31h old — data may be stale.</Banner>
            <Banner tone="violet" action actionLabel="Details">Agent running in degraded mode — using cached embeddings.</Banner>
            <Banner tone="red" action actionLabel="Retry">Database unreachable. Showing your last cached results.</Banner>
          </div></div>
        </Grp>
      </Section>

      {/* SKELETON + EMPTY/ERROR */}
      <Section label="Components" title="Loading, empty & error states" sub="Skeletons shimmer phosphor. Errors always carry a recovery action and a plain-language cause — never a stack trace.">
        <Grp label="Skeletons"><div className="row" style={{ alignItems: 'flex-start' }}>
          <Skeleton variant="card" />
          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 8 }}><Skeleton variant="row" /><Skeleton variant="row" /></div>
          <Skeleton variant="radar" width={88} height={88} />
        </div></Grp>
        <Grp label="Empty · error" style={{ marginBottom: 0 }}><div className="grid2">
          <div className="panel"><EmptyState title="No roles yet" description="Run a sweep to scan this month's “Who is hiring” thread." action="Run sweep" actionIcon="play" /></div>
          <div className="panel"><ErrorState cause="Couldn't reach the database" detail="We'll keep retrying in the background." onRetry={() => pushToast({ tone: 'info', title: 'Retrying…' })} /></div>
        </div></Grp>
      </Section>

      {/* OVERLAYS */}
      <Section label="Components" title="Overlays" sub="Modal, destructive confirm, drawer, dropdown menu, tooltip, and the ⌘K command palette. Esc closes; focus is trapped and returned.">
        <div className="row">
          <Button variant="secondary" iconLeft="command" onClick={() => setPalette(true)}>Command palette</Button>
          <Button variant="secondary" iconLeft="settings" onClick={() => setModal(true)}>Modal</Button>
          <Button variant="destructive" onClick={() => setConfirm(true)}>Confirm destructive</Button>
          <Button variant="secondary" iconLeft="list" onClick={() => setDrawer(true)}>Drawer</Button>
          <Menu trigger={<Button variant="ghost" iconRight="chevron-down">Row actions</Button>} items={[
            { label: 'Open posting', icon: 'external-link', shortcut: '↵' },
            { label: 'Copy link', icon: 'copy' },
            { label: 'Save to shortlist', icon: 'bookmark' },
            { divider: true },
            { label: 'Discard', icon: 'close', danger: true },
          ]} />
          <Tooltip label="06:00 UTC daily"><span style={{ font: 'var(--mono-sm)', color: 'var(--text-mid)', borderBottom: '1px dotted var(--text-low)', cursor: 'help' }}>LAST SWEEP</span></Tooltip>
        </div>
      </Section>

      {/* mounted overlays */}
      <Modal open={modal} onClose={() => setModal(false)} title="Sweep settings"
        footer={<><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button variant="primary" onClick={() => { setModal(false); pushToast({ tone: 'success', title: 'Settings saved' }); }}>Save</Button></>}>
        <div className="col" style={{ gap: 14 }}>
          <p style={{ margin: 0, font: 'var(--text-sm)', color: 'var(--text-body)' }}>Configure when the radar scans new postings and how aggressively the agent shortlists.</p>
          <RangeSlider value={sal} onChange={(e) => setSal(+e.target.value)} min={80} max={400} step={5} label="Minimum base salary" format={(v) => '$' + v + 'K'} />
          <Toggle checked={remote} onChange={setRemote} label="Remote roles only" />
        </div>
      </Modal>
      <ConfirmModal open={confirm} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); pushToast({ tone: 'success', title: 'Discarded 2 dead letters' }); }}
        title="Discard 2 dead letters?" message="These failed ingestion items will be permanently removed from the queue." confirmLabel="Discard" />
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Cortex Labs · Staff Engineer"
        footer={<Button variant="primary" iconLeft="bookmark" onClick={() => setDrawer(false)}>Save to shortlist</Button>}>
        <div className="col" style={{ gap: 16 }}>
          <div className="row"><ScoreGauge score={92} size={64} label="Match" /><div className="col" style={{ gap: 6 }}><span style={{ font: 'var(--mono-base)', color: 'var(--phosphor)' }}>$210–250K</span><div className="row"><StatusBadge status="REMOTE" /><StatusBadge status="VISA" /></div></div></div>
          <div><SectionLabel>Agent reasoning</SectionLabel><p style={{ margin: '8px 0 0', font: 'var(--text-sm)', color: 'var(--text-body)' }}>Strong overlap on Rust + distributed systems. Compensation above your $180K floor. Remote-friendly with visa support.</p></div>
        </div>
      </Drawer>
      <CommandPalette open={palette} onClose={() => setPalette(false)} onSelect={() => setPalette(false)} onSearchFallback={() => setPalette(false)} groups={[
        { label: 'Actions', items: [{ id: 'run', label: 'Run sweep now', icon: 'play', hint: '⌘↵' }, { id: 'agent', label: 'Ask agent to shortlist', icon: 'bot' }, { id: 'export', label: 'Export shortlist', icon: 'external-link' }] },
        { label: 'Navigate', items: [{ id: 'feed', label: 'Open signal feed', icon: 'list', hint: 'G F' }, { id: 'saved', label: 'Saved roles', icon: 'bookmark', hint: 'G S' }, { id: 'settings', label: 'Settings', icon: 'settings', hint: 'G ,' }] },
      ]} />

      {/* toasts */}
      {ReactDOM.createPortal(
        toasts.map((t) => (
          <Toast key={t.id} tone={t.tone} title={t.title} message={t.message} action={t.action} undoSeconds={t.undoSeconds}
            onClose={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} />
        )),
        document.getElementById('toaststack')
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
} // end if (NS)

