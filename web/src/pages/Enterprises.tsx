import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Building2, Phone, Mail, MapPin, Clock, Crown, Users, Sparkles,
  ShieldCheck, Layers, FileText, TrendingUp, ArrowRight,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { BrandMark, ThemeToggle } from '../components/ui';

type Pkg = {
  key: string; name: string; priceLabel: string; priceNote?: string; forWho: string;
  seats: number; postsPerMonth: number; talentPool?: string; roleAccess?: string; sla?: string;
  popular?: boolean; managed: boolean; features: string[];
};
type Pool = { key: string; label: string; count: number };
type Special = { key: string; label: string; note: string };
type Stats = { asOf: string; vettedTalent: string; specialists: string; institutionsServed: string; avgTimeToRoster: string; retention90d: string; subCitiesCovered: number };
type Contact = { callCenter: string; shortCode: string; email: string; enterpriseEmail: string; address: string; hours: string };
type Overview = { packages: Pkg[]; talentPools: Pool[]; specialTalents: Special[]; stats: Stats; contact: Contact };

const STEPS = [
  { icon: FileText, t: 'Agree terms', d: 'We scope your needs and sign a service agreement with pricing and SLAs.' },
  { icon: ShieldCheck, t: 'Role access provisioned', d: 'On signature we provision your admin + manager seats with permissions.' },
  { icon: Layers, t: 'Build your talent pool', d: 'Pool pre-vetted talent, bulk-post roles, and tap specialist services.' },
  { icon: TrendingUp, t: 'Roster, manage, report', d: 'Hire at scale (or let us manage it) with analytics and monthly reviews.' },
];

export function Enterprises() {
  const nav = useNavigate();
  const [data, setData] = useState<Overview | null>(null);
  const [form, setForm] = useState({ name: '', org: '', contact: '', pkg: '', orgSize: '', roles: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<Overview>('/api/enterprise/overview').then(setData).catch(() => {});
  }, []);

  function choose(pkg: string) {
    setForm((s) => ({ ...s, pkg }));
    document.getElementById('inquire')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (form.name.trim().length < 2 || form.contact.trim().length < 5) {
      setErr('Please enter your name and a phone or email we can reach you on.');
      return;
    }
    setSending(true);
    try {
      await api.post('/api/enterprise/lead', { kind: 'enterprise', ...form });
      setSent(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const pkgs = data?.packages ?? [];
  const stats = data?.stats;
  const contact = data?.contact;

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-20 border-b border-black/[0.05] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <button onClick={() => nav('/')} className="flex items-center gap-2 text-sm font-semibold text-ink"><ArrowLeft className="h-4 w-4" /> Serategna</button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => choose('')} className="btn-brand px-4 py-2 text-sm">Talk to sales</button>
          </div>
        </div>
      </header>

      {/* Hero + updated stats */}
      <section className="mx-auto max-w-5xl px-5 pt-10">
        <span className="pill bg-brand-50 text-brand-700"><Building2 className="h-3 w-3" /> Serategna for Enterprises</span>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Workforce at scale — pooled, vetted, managed.</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Build a private talent pool, bulk-hire across locations, and tap individually-vetted specialists. Manager and admin
          role access is provisioned the moment your agreement is signed.
        </p>
        {stats && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { v: stats.vettedTalent, l: 'Vetted talent' },
                { v: stats.specialists, l: 'Specialists' },
                { v: stats.institutionsServed, l: 'Institutions' },
                { v: stats.avgTimeToRoster, l: 'Avg. time to roster' },
                { v: stats.retention90d, l: '90-day retention' },
                { v: String(stats.subCitiesCovered), l: 'Sub-cities' },
              ].map((s) => (
                <div key={s.l} className="card p-4 text-center">
                  <p className="text-xl font-extrabold text-brand-700">{s.v}</p>
                  <p className="text-[11px] leading-tight text-muted">{s.l}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{stats.asOf}</p>
          </>
        )}
      </section>

      {/* Packages */}
      <section className="mx-auto mt-10 max-w-5xl px-5">
        <h2 className="text-2xl font-extrabold">Packages</h2>
        <p className="mt-1 text-sm text-muted">Enterprise-grade plans. Final pricing &amp; SLAs are set in your agreement.</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {pkgs.map((p) => (
            <div key={p.key} className={`card relative flex flex-col p-6 ${p.popular ? 'ring-2 ring-brand-500' : ''} ${p.managed ? 'ring-2 ring-ink' : ''}`}>
              {p.popular && <span className="pill absolute -top-3 left-6 bg-brand-600 text-white"><Crown className="h-3 w-3" /> Most popular</span>}
              {p.managed && <span className="pill absolute -top-3 left-6 bg-ink text-white"><Sparkles className="h-3 w-3" /> Fully managed</span>}
              <h3 className="text-lg font-extrabold">{p.name}</h3>
              <p className="text-xs text-muted">{p.forWho}</p>
              <p className="mt-3 text-2xl font-extrabold text-brand-700">{p.priceLabel}</p>
              {p.priceNote && <p className="text-[11px] text-muted">{p.priceNote}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.seats > 0 && <span className="pill bg-mist text-ink"><Users className="h-3 w-3" /> {p.seats} seats</span>}
                {p.postsPerMonth > 0 && <span className="pill bg-mist text-ink">{p.postsPerMonth} posts/mo</span>}
                {p.postsPerMonth === -1 && <span className="pill bg-mist text-ink">Unlimited posts</span>}
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {f}</li>
                ))}
              </ul>
              {p.roleAccess && (
                <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-[11px] text-brand-700">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p.roleAccess}
                </p>
              )}
              <button onClick={() => choose(p.name)} className={`mt-4 ${p.managed || p.popular ? 'btn-brand' : 'btn-ghost'}`}>
                {p.managed ? 'Talk to us' : `Request ${p.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Talent pools */}
      <section className="mx-auto mt-12 max-w-5xl px-5">
        <h2 className="text-2xl font-extrabold">Talent pools</h2>
        <p className="mt-1 text-sm text-muted">Draw from pre-vetted, guarantor-backed pools — or build a private branded pool you retain.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(data?.talentPools ?? []).map((t) => (
            <div key={t.key} className="card flex items-center justify-between p-4">
              <span className="min-w-0 pr-2 text-sm font-semibold text-ink">{t.label}</span>
              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">{t.count.toLocaleString()}+</span>
            </div>
          ))}
        </div>
      </section>

      {/* Special talents */}
      <section className="mx-auto mt-12 max-w-5xl px-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h2 className="text-2xl font-extrabold">Special Talent services</h2>
        </div>
        <p className="mt-1 text-sm text-muted">Individually vetted, background-checked specialists — placed per role, by agreement.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.specialTalents ?? []).map((s) => (
            <div key={s.key} className="card p-5">
              <p className="font-bold text-ink">{s.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works / role access on agreement */}
      <section className="mx-auto mt-12 max-w-5xl px-5">
        <h2 className="text-2xl font-extrabold">How it works</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.t} className="card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><s.icon className="h-5 w-5" /></div>
              <p className="mt-3 text-sm font-bold text-ink">{i + 1}. {s.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Inquiry + contact */}
      <section id="inquire" className="mx-auto mt-12 grid max-w-5xl gap-6 px-5 pb-16 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-xl font-extrabold">Request a proposal</h2>
          <p className="mt-1 text-sm text-muted">Tell us about your hiring needs. Our enterprise team replies within one business day.</p>
          {sent ? (
            <div className="mt-5 rounded-2xl bg-brand-50 p-5 text-center">
              <Check className="mx-auto h-8 w-8 text-brand-600" />
              <p className="mt-2 font-semibold">Thank you — we've got your request.</p>
              <p className="text-sm text-muted">Our enterprise team will reach out on the contact you provided.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Your name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></div>
                <div><label className="label">Organisation</label><input className="input" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="Company / institution" /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Phone or email</label><input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="+251… or name@org.et" /></div>
                <div>
                  <label className="label">Organisation size</label>
                  <select className="input" value={form.orgSize} onChange={(e) => setForm({ ...form, orgSize: e.target.value })}>
                    <option value="">Select…</option>
                    {['1–20', '21–100', '101–500', '500+'].map((s) => <option key={s} value={s}>{s} staff</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Package of interest</label>
                <select className="input" value={form.pkg} onChange={(e) => setForm({ ...form, pkg: e.target.value })}>
                  <option value="">Not sure yet</option>
                  {pkgs.map((p) => <option key={p.key} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="label">Roles &amp; volume needed</label><input className="input" value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })} placeholder="e.g. 20 cleaners, 5 security, 2 chefs" /></div>
              <div><label className="label">Anything else?</label><textarea className="input min-h-[80px]" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Timeline, locations, special requirements…" /></div>
              {err && <p className="text-sm text-crimson">{err}</p>}
              <button disabled={sending} className="btn-brand w-full">{sending ? 'Sending…' : 'Send request'}</button>
            </form>
          )}
        </div>

        <div className="space-y-4">
          <div className="hero p-6">
            <div className="flex items-center gap-2.5"><BrandMark size={30} /><span className="font-extrabold">Serategna Enterprise</span></div>
            <p className="mt-3 text-sm text-white/80">Prefer to talk? Reach our enterprise desk — Amharic, Afaan Oromo &amp; English.</p>
            <button onClick={() => nav('/login')} className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-ink">Open the app <ArrowRight className="h-4 w-4" /></button>
          </div>
          {contact && (
            <div className="card space-y-3 p-6 text-sm">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-brand-600" /> {contact.callCenter} <span className="text-muted">· {contact.shortCode}</span></p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-brand-600" /> {contact.enterpriseEmail}</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-brand-600" /> {contact.address}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-brand-600" /> {contact.hours}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
