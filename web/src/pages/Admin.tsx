import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShieldCheck, AlertTriangle, Siren, Scale, LogOut, Check, X, RefreshCw, Plug, CreditCard, Map, MessageSquare, Bell, Fingerprint, TrendingUp, Target, Award, Inbox, FileSearch, Search,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { etb, relTime } from '../lib/format';
import { GradientOrb, Spinner, Pill } from '../components/ui';

type Tab = 'dashboard' | 'business' | 'verifications' | 'certifications' | 'disputes' | 'sos' | 'leads' | 'data' | 'integrations';

export function Admin() {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles.admin) return <Navigate to="/app/home" replace />;

  const NAV: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'business', label: 'Business', icon: TrendingUp },
    { key: 'verifications', label: 'Verifications', icon: ShieldCheck },
    { key: 'certifications', label: 'Certifications', icon: Award },
    { key: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { key: 'sos', label: 'SoS desk', icon: Siren },
    { key: 'leads', label: 'Leads', icon: Inbox },
    { key: 'data', label: 'Data (DPO)', icon: FileSearch },
    { key: 'integrations', label: 'Integrations', icon: Plug },
  ];

  return (
    <div className="flex min-h-screen text-ink">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-white p-5 md:flex">
        <div className="flex items-center gap-2.5">
          <GradientOrb size={36} />
          <div>
            <p className="font-extrabold">Serategna</p>
            <p className="text-xs text-muted">Operations console</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setTab(n.key)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${tab === n.key ? 'bg-ink text-white' : 'text-muted hover:bg-sand'}`}>
              <n.icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-1">
          <button onClick={() => nav('/app/home')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted hover:bg-sand">
            <RefreshCw className="h-4 w-4" /> Switch to app
          </button>
          <button onClick={() => { logout(); nav('/login'); }} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-5xl">
          {/* mobile tab bar */}
          <div className="mb-6 flex gap-2 overflow-x-auto md:hidden">
            {NAV.map((n) => (
              <button key={n.key} onClick={() => setTab(n.key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${tab === n.key ? 'bg-ink text-white' : 'bg-white text-muted'}`}>{n.label}</button>
            ))}
          </div>
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'business' && <Business />}
          {tab === 'verifications' && <Verifications />}
          {tab === 'certifications' && <CertVerifications />}
          {tab === 'disputes' && <Disputes />}
          {tab === 'sos' && <Sos />}
          {tab === 'leads' && <Leads />}
          {tab === 'data' && <DataSubject />}
          {tab === 'integrations' && <Integrations />}
        </div>
      </main>
    </div>
  );
}

function Dashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [recon, setRecon] = useState<any>(null);
  const [leak, setLeak] = useState<any>(null);
  useEffect(() => {
    api.get('/api/admin/kpis').then(setKpis).catch(() => undefined);
    api.get('/api/admin/reconciliation').then(setRecon).catch(() => undefined);
    api.get('/api/admin/leakage').then(setLeak).catch(() => undefined);
  }, []);
  if (!kpis) return <Spinner />;

  const cards = [
    { label: 'Active workers', value: kpis.activeWorkers },
    { label: 'Tier-1 verified', value: kpis.tier1Workers },
    { label: 'Jobs completed', value: kpis.jobsCompleted },
    { label: 'Subscription revenue', value: etb(kpis.revenue) },
    { label: 'Active subscriptions', value: kpis.activeSubscriptions ?? 0 },
    { label: 'Funds held by platform', value: etb(kpis.fundsHeld ?? 0) },
    { label: 'Dispute rate', value: `${(kpis.disputeRate * 100).toFixed(1)}%` },
    { label: 'Pending verifications', value: kpis.pendingVerifications },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <p className="text-sm text-muted">Phase 1 board metrics (spec B5)</p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-3xl bg-white p-5 shadow-card">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-brand-600" />
            <h2 className="font-bold">Ledger reconciliation</h2>
          </div>
          {recon && (
            <>
              <div className="mt-3 flex items-center gap-2">
                {recon.balanced ? <Pill tone="brand"><Check className="h-3 w-3" /> Balanced</Pill> : <Pill tone="rose">Variance {recon.variance}</Pill>}
                <span className="text-xs text-muted">{recon.entryCount} journal entries</span>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                {Object.entries(recon.accounts).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted">{k.replace(/_/g, ' ')}</span>
                    <span className="font-semibold">{etb(v as number)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <h2 className="font-bold">Disintermediation / leakage</h2>
          <p className="text-xs text-muted">Repeat-pair on-platform share (target ≥ 60%)</p>
          {leak && (
            <div className="mt-4">
              <p className="text-4xl font-extrabold text-brand-600">{Math.round((leak.repeatRate ?? 0) * 100)}%</p>
              <p className="mt-1 text-sm text-muted">{leak.singleMatchPairs} single-match pairs of {leak.totalPairs} total</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Verifications() {
  const [queue, setQueue] = useState<any[] | null>(null);
  const load = () => api.get<any[]>('/api/admin/verifications').then(setQueue);
  useEffect(() => { load(); }, []);
  async function decide(id: string, decision: 'approved' | 'rejected') {
    await api.post(`/api/admin/verifications/${id}/decide`, { decision });
    load();
  }
  if (!queue) return <Spinner />;
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Verification queue</h1>
      <p className="text-sm text-muted">Tier 0 → Tier 1 (Fayda). Agent-assisted review.</p>
      <div className="mt-6 space-y-3">
        {queue.length === 0 && <p className="rounded-3xl bg-white p-6 text-sm text-muted shadow-card">Queue empty 🎉</p>}
        {queue.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-card">
            <div>
              <p className="font-semibold">{v.user?.name}</p>
              <p className="text-xs text-muted">{v.user?.phone} · Fayda {v.faydaNumber} · {relTime(v.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => decide(v.id, 'approved')} className="btn-brand px-4 py-2"><Check className="h-4 w-4" /> Approve</button>
              <button onClick={() => decide(v.id, 'rejected')} className="btn-ghost px-4 py-2 text-rose-600"><X className="h-4 w-4" /> Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertVerifications() {
  const [queue, setQueue] = useState<any[] | null>(null);
  const load = () => api.get<any[]>('/api/admin/certifications').then(setQueue);
  useEffect(() => { load(); }, []);
  async function decide(id: string, decision: 'verified' | 'rejected') {
    await api.post(`/api/admin/certifications/${id}/decide`, { decision });
    load();
  }
  if (!queue) return <Spinner />;
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Certifications</h1>
      <p className="text-sm text-muted">Verify skills certificates against the issuing institution.</p>
      <div className="mt-6 space-y-3">
        {queue.length === 0 && <p className="rounded-3xl bg-white p-6 text-sm text-muted shadow-card">Queue empty 🎉</p>}
        {queue.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-card">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-muted">{c.user?.name} · {c.institution}{c.year ? ` · ${c.year}` : ''}{c.refNo ? ` · #${c.refNo}` : ''}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => decide(c.id, 'verified')} className="btn-brand px-4 py-2"><Check className="h-4 w-4" /> Verify</button>
              <button onClick={() => decide(c.id, 'rejected')} className="btn-ghost px-4 py-2 text-rose-600"><X className="h-4 w-4" /> Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Disputes() {
  const [items, setItems] = useState<any[] | null>(null);
  const load = () => api.get<any[]>('/api/admin/disputes').then(setItems);
  useEffect(() => { load(); }, []);
  async function resolve(id: string, outcome: 'refund' | 'release' | 'reject') {
    await api.post(`/api/admin/disputes/${id}/resolve`, { outcome });
    load();
  }
  if (!items) return <Spinner />;
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Disputes</h1>
      <p className="text-sm text-muted">48-hour SLA. Mediator decisions move escrow.</p>
      <div className="mt-6 space-y-3">
        {items.length === 0 && <p className="rounded-3xl bg-white p-6 text-sm text-muted shadow-card">No open disputes.</p>}
        {items.map((d) => (
          <div key={d.id} className="rounded-3xl bg-white p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{d.job?.title}</p>
                <p className="text-xs text-muted">Opened by {d.opener?.name} · {relTime(d.openedAt)}</p>
                <p className="mt-2 text-sm">{d.reason}</p>
              </div>
              <Pill tone="amber">{etb(d.job?.agreedPrice)}</Pill>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => resolve(d.id, 'refund')} className="btn-ghost px-4 py-2 text-rose-600">Refund client</button>
              <button onClick={() => resolve(d.id, 'release')} className="btn-brand px-4 py-2">Release to worker</button>
              <button onClick={() => resolve(d.id, 'reject')} className="btn-ghost px-4 py-2">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Business() {
  const [b, setB] = useState<any>(null);
  useEffect(() => { api.get('/api/admin/business').then(setB).catch(() => undefined); }, []);
  if (!b) return <Spinner />;
  const u = b.unitEconomics;

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Business model</h1>
      <p className="text-sm text-muted">Unit economics & Phase-1 exit criteria (Business Model Pt 3)</p>

      {/* context cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Addressable workers', value: b.context.addressableWorkers },
          { label: 'Break-even month', value: b.context.breakEvenMonth },
          { label: '36-month revenue', value: b.context.cumulative36mRevenue },
          { label: 'Phase-1 target', value: b.context.phase1TargetRevenue },
        ].map((c) => (
          <div key={c.label} className="rounded-3xl bg-white p-5 shadow-card">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-1 text-xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* unit economics */}
      <h2 className="mt-8 font-bold">Unit economics (per job, live)</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Avg. job value', value: etb(u.avgJobValue) },
          { label: 'Blended take-rate', value: `${(u.blendedTakeRate * 100).toFixed(1)}%` },
          { label: 'Net commission / job', value: etb(u.netCommissionPerJob) },
          { label: 'Guarantee reserve / job', value: etb(u.guaranteeReservePerJob) },
          { label: 'Revenue to date', value: etb(u.revenueToDate) },
          { label: 'Gross marketplace value', value: etb(u.grossMarketplaceValue) },
        ].map((c) => (
          <div key={c.label} className="rounded-3xl bg-white p-5 shadow-card">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* exit criteria */}
      <h2 className="mt-8 flex items-center gap-2 font-bold"><Target className="h-5 w-5 text-brand-600" /> Phase-1 exit criteria</h2>
      <div className="mt-3 space-y-3">
        {b.exitCriteria.map((c: any) => {
          const pct = c.unit === '%' ? c.current * 100 : c.current;
          const tgt = c.unit === '%' ? c.target * 100 : c.target;
          const ratio = Math.max(0, Math.min(100, c.lowerIsBetter ? (c.current <= c.target ? 100 : (c.target / Math.max(c.current, 0.0001)) * 100) : (c.current / c.target) * 100));
          return (
            <div key={c.label} className="rounded-3xl bg-white p-4 shadow-card">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{c.label}</span>
                <span className={c.met ? 'text-brand-600' : 'text-muted'}>
                  {c.unit === '%' ? `${pct.toFixed(0)}%` : pct.toLocaleString()} / {c.unit === '%' ? `${tgt.toFixed(0)}%` : tgt.toLocaleString()} {c.met && '✓'}
                </span>
              </div>
              <div className="mt-2 bar-track"><div className="bar-fill" style={{ width: `${ratio}%` }} /></div>
            </div>
          );
        })}
      </div>

      {/* revenue streams */}
      <h2 className="mt-8 font-bold">Revenue streams (7, phased)</h2>
      <div className="mt-3 space-y-2">
        {b.revenueStreams.map((r: any) => (
          <div key={r.name} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mist text-xs font-bold text-brand-700">P{r.phase}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="text-xs text-muted">{r.detail}</p>
            </div>
            <Pill tone={r.live ? 'brand' : 'amber'}>{r.live ? 'Live' : `Phase ${r.phase}`}</Pill>
          </div>
        ))}
      </div>
    </div>
  );
}

function Integrations() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { api.get('/api/integrations/status').then(setS).catch(() => undefined); }, []);
  if (!s) return <Spinner />;

  const rows = [
    { icon: CreditCard, label: 'Payments (PSO aggregator)', on: s.payments.configured, detail: `adapter: ${s.payments.adapter} · rails: ${s.payments.rails.join(', ')} · webhook ${s.payments.webhookSecured ? 'secured' : 'open (dev)'}` },
    { icon: Map, label: 'Google Maps', on: s.maps.configured, detail: s.maps.configured ? 'API key configured' : 'using styled fallback map (set VITE_GOOGLE_MAPS_KEY)' },
    { icon: MessageSquare, label: 'SMS gateway', on: s.sms.configured, detail: `provider: ${s.sms.provider}` },
    { icon: Bell, label: 'Push (FCM)', on: s.push.configured, detail: s.push.configured ? 'configured' : 'not configured' },
    { icon: MessageSquare, label: 'Telegram bot', on: s.telegram.configured, detail: s.telegram.configured ? 'configured' : 'not configured' },
    { icon: Fingerprint, label: 'Fayda / MOSIP identity', on: s.identity.configured, detail: s.identity.configured ? 'API configured' : 'manual review fallback active' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Integrations</h1>
      <p className="text-sm text-muted">External services wired behind adapter seams (spec B3.4, E1).</p>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-card">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mist text-brand-600"><r.icon className="h-5 w-5" /></span>
            <div className="flex-1">
              <p className="font-semibold">{r.label}</p>
              <p className="text-xs text-muted">{r.detail}</p>
            </div>
            <Pill tone={r.on ? 'brand' : 'amber'}>{r.on ? 'Active' : 'Fallback'}</Pill>
          </div>
        ))}
      </div>
    </div>
  );
}

const LEAD_TONE: Record<string, 'brand' | 'amber' | 'rose'> = { enterprise: 'brand', callback: 'amber', support: 'rose' };

function Leads() {
  const [items, setItems] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<string>('all');
  useEffect(() => { api.get<any[]>('/api/admin/leads').then(setItems).catch(() => setItems([])); }, []);
  if (!items) return <Spinner />;
  const shown = filter === 'all' ? items : items.filter((l) => l.kind === filter);
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Leads</h1>
      <p className="text-sm text-muted">Enterprise inquiries, callback & support requests.</p>
      <div className="mt-4 flex gap-2">
        {['all', 'enterprise', 'callback', 'support'].map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${filter === k ? 'bg-ink text-white' : 'bg-white text-muted shadow-card'}`}>{k}</button>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {shown.length === 0 && <p className="rounded-3xl bg-white p-6 text-sm text-muted shadow-card">No leads yet.</p>}
        {shown.map((l) => (
          <div key={l.id} className="rounded-3xl bg-white p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{l.name}{l.org ? ` · ${l.org}` : ''}</p>
                <p className="text-xs text-muted">{l.contact}{l.pkg ? ` · ${l.pkg}` : ''} · {relTime(l.createdAt)}</p>
                {l.message && <p className="mt-2 text-sm">{l.message}</p>}
              </div>
              <Pill tone={LEAD_TONE[l.kind] ?? 'amber'}>{l.kind}</Pill>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataSubject() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function lookup() {
    if (query.trim().length < 3) { setErr('Enter at least 3 characters (phone, name or ID).'); return; }
    setBusy(true); setErr(''); setData(null);
    try {
      setData(await api.get<any>(`/api/admin/data-subject?query=${encodeURIComponent(query.trim())}`));
    } catch (e: any) {
      setErr(e?.message || 'No data subject found');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Data-subject access (DPO)</h1>
      <p className="text-sm text-muted">Lawful access under Proclamation No. 1321/2024. Every lookup is logged to the audit trail.</p>
      <div className="mt-5 flex gap-2">
        <input className="input flex-1" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookup()} placeholder="Phone, name or user ID" />
        <button onClick={lookup} disabled={busy} className="btn-brand px-5"><Search className="h-4 w-4" /> Lookup</button>
      </div>
      {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
      {data && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-amber-accent/10 px-4 py-3 text-xs text-amber-accent">{data.legalBasis}</div>
          <div className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="font-bold">{data.user.name}</h2>
            <p className="text-xs text-muted">{data.user.phone} · {data.user.accountType} · tier {data.user.tier} · Fayda {data.user.faydaStatus} · joined {relTime(data.user.createdAt)}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[['Jobs as worker', data.counts.jobsAsWorker], ['Jobs as client', data.counts.jobsAsClient], ['Ratings', data.counts.ratings]].map(([l, v]) => (
                <div key={l as string} className="rounded-2xl bg-mist p-3"><p className="text-lg font-extrabold">{v as number}</p><p className="text-[10px] text-muted">{l as string}</p></div>
              ))}
            </div>
            {data.workerProfile && <p className="mt-3 text-sm text-muted">Trades: {data.workerProfile.categories.join(', ') || '—'} · {data.workerProfile.subCity}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              <Pill>{data.certifications.length} certifications</Pill>
              <Pill>{data.guarantors.length} guarantors</Pill>
              <Pill>{data.consents.length} consents</Pill>
              {data.psychometric && <Pill tone="brand">Reliability {data.psychometric.reliabilityIndex}</Pill>}
            </div>
          </div>
          <details className="rounded-3xl bg-white p-5 shadow-card">
            <summary className="cursor-pointer text-sm font-semibold">Raw export (JSON)</summary>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-mist p-3 text-[11px] text-ink">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

function Sos() {
  const [items, setItems] = useState<any[] | null>(null);
  const load = () => api.get<any[]>('/api/admin/sos').then(setItems);
  useEffect(() => { load(); }, []);
  async function resolve(id: string, status: string) {
    await api.post(`/api/admin/sos/${id}/resolve`, { status });
    load();
  }
  if (!items) return <Spinner />;
  return (
    <div>
      <h1 className="text-2xl font-extrabold">SoS desk</h1>
      <p className="text-sm text-muted">Encrypted audio is held by the emergency provider — Serategna cannot decrypt it.</p>
      <div className="mt-6 space-y-3">
        {items.length === 0 && <p className="rounded-3xl bg-white p-6 text-sm text-muted shadow-card">No active alerts.</p>}
        {items.map((e) => (
          <div key={e.id} className="rounded-3xl bg-white p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-2 font-semibold"><Siren className="h-4 w-4 text-rose-600" /> {e.user?.name}</p>
                <p className="text-xs text-muted">{e.user?.phone} · {e.triggerType} trigger · {relTime(e.createdAt)}</p>
                {e.job?.title && <p className="mt-1 text-xs text-muted">Job: {e.job.title}</p>}
                <p className="mt-1 text-xs text-muted">{e.gpsTrail?.length ?? 0} GPS points logged</p>
              </div>
              <Pill tone="rose">{e.status}</Pill>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => resolve(e.id, 'acknowledged')} className="btn-ghost px-4 py-2">Acknowledge</button>
              <button onClick={() => resolve(e.id, 'resolved')} className="btn-brand px-4 py-2">Resolve</button>
              <button onClick={() => resolve(e.id, 'false_alarm')} className="btn-ghost px-4 py-2">False alarm</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
