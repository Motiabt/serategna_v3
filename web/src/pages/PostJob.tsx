import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Info, Sparkles, Loader2, Clock, Home, Scale, ShieldCheck, BadgeCheck, ChevronDown, Search } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { etb } from '../lib/format';
import { CategoryIcon } from '../components/icons';
import { Spinner, Sheet } from '../components/ui';
import { MapView } from '../components/MapView';
import { useI18n, loc } from '../lib/i18n';
import { PageHeader } from './_shared';

interface Category { key: string; en: string; am: string; om: string; icon: string; vertical: string }
interface EmpType { key: string; label: string; desc: string; defaultRate: string; group?: boolean; requiresEscrow: boolean }
interface SubCity { name: string; lat: number; lng: number }
interface RoleOpt { k: string; en: string; am: string; om: string; t: string }

export function PostJob() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const preset = params.get('preset');
  const { lang } = useI18n();
  const [cats, setCats] = useState<Category[]>([]);
  const [empTypes, setEmpTypes] = useState<EmpType[]>([]);
  const [subCities, setSubCities] = useState<SubCity[]>([]);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState('');
  const [roleOpts, setRoleOpts] = useState<RoleOpt[]>([]);
  const [role, setRole] = useState('');
  const [employmentType, setEmploymentType] = useState('gig');
  const [formality, setFormality] = useState<'formal' | 'informal'>('informal');
  const [positions, setPositions] = useState(1);
  const [rateType, setRateType] = useState('fixed');
  const [durationLabel, setDurationLabel] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subCity, setSubCity] = useState('Bole');
  const [pricingMode, setPricingMode] = useState<'bid' | 'fixed'>('bid');
  const [fixedPrice, setFixedPrice] = useState('');
  const [band, setBand] = useState<{ low: number; high: number } | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [liveIn, setLiveIn] = useState(false);
  const [daysOff, setDaysOff] = useState('Sunday');
  const [duties, setDuties] = useState<string[]>([]);
  const [guarantorRequired, setGuarantorRequired] = useState(false);
  const [wage, setWage] = useState<any>(null);
  const [fee, setFee] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [subSheet, setSubSheet] = useState(false);
  const [postError, setPostError] = useState('');
  const [catPicker, setCatPicker] = useState(false);
  const [catQuery, setCatQuery] = useState('');

  const DOMESTIC = ['home_cleaning', 'care_domestic'];
  const isDomestic = DOMESTIC.includes(category);
  const DUTY_OPTIONS = ['Cleaning', 'Cooking', 'Laundry & ironing', 'Childcare', 'Elderly care', 'Shopping/errands', 'Dishwashing', 'Gardening'];
  const floor = wage ? (wage[rateType] ?? 0) : 0;
  const belowFloor = pricingMode === 'fixed' && floor > 0 && Number(fixedPrice || 0) > 0 && Number(fixedPrice) < floor;

  useEffect(() => {
    api.get<Category[]>('/api/catalog/categories').then((c) => { setCats(c); setCategory(c[0]?.key ?? ''); }).catch(() => undefined);
    api.get<EmpType[]>('/api/catalog/employment-types').then(setEmpTypes).catch(() => undefined);
    api.get<SubCity[]>('/api/catalog/sub-cities').then(setSubCities).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!category) return;
    api.get<{ low: number; high: number }>(`/api/catalog/price-band?category=${category}&subCity=${subCity}`).then(setBand).catch(() => setBand(null));
  }, [category, subCity]);

  useEffect(() => {
    if (!category) return;
    setRole('');
    api.get<RoleOpt[]>(`/api/catalog/roles?group=${category}`).then(setRoleOpts).catch(() => setRoleOpts([]));
  }, [category]);

  useEffect(() => { setLiveIn(role.includes('live_in')); }, [role]);

  useEffect(() => { api.get<any>('/api/subscription').then(setSub).catch(() => undefined); }, []);

  // Housemaid preset (from the home "Hire a trusted housemaid" card)
  useEffect(() => {
    if (preset === 'housemaid' && cats.length) {
      setEmploymentType('permanent');
      setCategory('home_cleaning');
      setRateType('monthly');
      setFormality('formal');
      setGuarantorRequired(true);
    }
  }, [preset, cats.length]);

  // living-wage floor (prorated; live-in roles get the cash floor)
  useEffect(() => {
    api.get<any>(`/api/catalog/living-wage?liveIn=${liveIn}`).then(setWage).catch(() => setWage(null));
  }, [liveIn]);

  // transparent fee breakdown (anti-delala)
  useEffect(() => {
    const amt = Number(fixedPrice) || (band ? Math.round((band.low + band.high) / 2) : 0);
    if (!amt) { setFee(null); return; }
    const cat = cats.find((c) => c.key === category);
    api.get<any>(`/api/catalog/fee-preview?amount=${amt}&vertical=${cat?.vertical ?? 'home'}`).then(setFee).catch(() => setFee(null));
  }, [fixedPrice, band, category, cats]);

  const et = empTypes.find((e) => e.key === employmentType);

  function pickType(key: string) {
    setEmploymentType(key);
    const t = empTypes.find((e) => e.key === key);
    if (t) {
      setRateType(t.defaultRate);
      setFormality(key === 'permanent' || key === 'contract' ? 'formal' : 'informal');
      if (!t.group) setPositions(1);
    }
  }

  async function aiDraft() {
    setAiBusy(true);
    try {
      const draft = await api.post<any>('/api/ai/job-draft', { prompt: title, category, subCity, employmentType });
      setTitle(draft.title);
      setDescription(draft.description);
      setRateType(draft.rateType);
      setFormality(draft.formality);
      if (draft.durationLabel) setDurationLabel(draft.durationLabel);
    } finally {
      setAiBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setPostError('');
    try {
      const cat = cats.find((c) => c.key === category);
      const job = await api.post<any>('/api/jobs', {
        category,
        role: role || undefined,
        vertical: cat?.vertical ?? 'home',
        title,
        description,
        subCity,
        pricingMode,
        fixedPrice: pricingMode === 'fixed' ? Number(fixedPrice) : undefined,
        lat: pin?.lat,
        lng: pin?.lng,
        employmentType,
        formality,
        rateType,
        positions,
        durationLabel: durationLabel || undefined,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        liveIn,
        daysOff: isDomestic ? daysOff : undefined,
        duties: isDomestic ? duties : [],
        guarantorRequired,
      });
      nav(`/app/job/${job.id}`);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 402) { setSubSheet(true); api.get<any>('/api/subscription').then(setSub).catch(() => undefined); }
      else setPostError(err.message || 'Could not post job');
    } finally {
      setBusy(false);
    }
  }

  async function subscribe(plan: 'monthly' | 'annual') {
    // Payment is collected through the licensed PSP. A real gateway returns a
    // hosted checkout URL to redirect to; the mock confirms instantly.
    const r = await api.post<any>('/api/subscription/subscribe', { plan });
    if (r?.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
    const s = await api.get<any>('/api/subscription');
    setSub(s);
    setSubSheet(false);
  }

  if (cats.length === 0) return <Spinner />;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <PageHeader title="Post a job" sub="Any kind of work — from a one-off gig to a permanent hire" />

      <div className="space-y-5 px-5 pt-2">
        {preset === 'housemaid' && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-800">Hiring a permanent housemaid</p>
            <p className="mt-1 text-xs text-brand-700">No delala fee. A guarantor (ዋስ) is required, a fair minimum wage applies, and you'll agree terms in-app then sign the legal contract in person. Up to 4 housemaid posts/year.</p>
          </div>
        )}
        {/* Subscription status */}
        {sub && (
          sub.status === 'active' ? (
            <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-2.5 text-xs text-brand-700">
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4" /> {sub.plan} plan active</span>
              <span className="font-semibold">{sub.postsRemaining}/{sub.postLimit} posts left this month</span>
            </div>
          ) : sub.freePostAvailable ? (
            <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700">
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4" /> Your first job post is free</span>
              <span className="text-muted">then ETB 100/mo</span>
            </div>
          ) : (
            <button onClick={() => setSubSheet(true)} className="flex w-full items-center justify-between rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
              <span>Subscribe to post jobs</span>
              <span className="text-feature">ETB 100/mo →</span>
            </button>
          )
        )}

        {/* Employment type */}
        <div>
          <label className="label">Type of work</label>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {empTypes.map((e) => (
              <button key={e.key} onClick={() => pickType(e.key)} className={`shrink-0 rounded-2xl border px-3.5 py-2.5 text-left ${employmentType === e.key ? 'border-brand-500 bg-brand-50' : 'border-white/70 bg-white/70'}`}>
                <p className={`text-xs font-bold ${employmentType === e.key ? 'text-brand-700' : 'text-ink'}`}>{e.label}</p>
              </button>
            ))}
          </div>
          {et && <p className="mt-1.5 text-xs text-muted">{et.desc}</p>}
        </div>

        {/* Group hire positions */}
        {et?.group && (
          <div>
            <label className="label">How many workers? ({positions})</label>
            <input type="range" min={2} max={20} value={positions} onChange={(e) => setPositions(Number(e.target.value))} className="w-full accent-brand-600" />
          </div>
        )}

        {/* Category (taxonomy group) — searchable picker keeps 20+ groups tidy */}
        <div>
          <label className="label">Category</label>
          <button type="button" onClick={() => { setCatQuery(''); setCatPicker(true); }} className="flex w-full items-center justify-between rounded-2xl border border-black/[0.07] bg-[#f1f5f9] px-4 py-3.5 text-left">
            <span className="flex min-w-0 items-center gap-2.5">
              {(() => { const sc = cats.find((c) => c.key === category); return sc ? (
                <>
                  <CategoryIcon icon={sc.icon} className="h-5 w-5 shrink-0 text-brand-600" />
                  <span className="truncate text-sm font-semibold text-ink">{loc(sc, lang)}</span>
                </>
              ) : <span className="text-sm text-muted">Choose a category</span>; })()}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
          </button>
        </div>

        {/* Specialization role */}
        {roleOpts.length > 0 && (
          <div>
            <label className="label">Specialization (optional)</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Any specialization</option>
              {roleOpts.map((r) => (
                <option key={r.k} value={r.k}>{loc(r, lang)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Title + AI assist */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">What do you need?</span>
            <button onClick={aiDraft} disabled={aiBusy} className="flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
              {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Smart draft
            </button>
          </div>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Deep clean 2-bedroom apartment" />
        </div>

        <div>
          <label className="label">Details</label>
          <textarea className="input min-h-[90px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add specifics, or tap “Smart draft”." />
        </div>

        {/* Formality + duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Formality</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['informal', 'formal'] as const).map((f) => (
                <button key={f} onClick={() => setFormality(f)} className={`rounded-2xl border px-2 py-2.5 text-xs font-semibold capitalize ${formality === f ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-white/70 bg-white/70 text-muted'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Duration</label>
            <input className="input" value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} placeholder="e.g. 3 months" />
          </div>
        </div>

        {/* Start / finish time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label flex items-center gap-1"><Clock className="h-3 w-3" /> Start</label>
            <input type="datetime-local" className="input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className="label flex items-center gap-1"><Clock className="h-3 w-3" /> Finish</label>
            <input type="datetime-local" className="input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>

        {/* Application deadline — job auto-removed once it passes */}
        <div>
          <label className="label flex items-center gap-1"><Clock className="h-3 w-3" /> Application deadline</label>
          <input type="datetime-local" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          <p className="mt-1 text-xs text-muted">{expiresAt ? 'This post closes and is removed automatically when the deadline passes.' : 'Optional — defaults to 14 days. Expired posts are removed automatically.'}</p>
        </div>

        {/* Rate type (for wages) */}
        {(employmentType === 'permanent' || employmentType === 'contract' || employmentType === 'short_term') && (
          <div>
            <label className="label">Pay rate</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['monthly', 'weekly', 'daily', 'hourly'] as const).map((r) => (
                <button key={r} onClick={() => setRateType(r)} className={`rounded-2xl border px-2 py-2.5 text-xs font-semibold capitalize ${rateType === r ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-white/70 bg-white/70 text-muted'}`}>{r}</button>
              ))}
            </div>
          </div>
        )}

        {/* Housemaid / domestic-contract fields */}
        {isDomestic && (
          <div className="card space-y-4 p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink"><Home className="h-4 w-4 text-brand-600" /> Domestic contract details</p>
            <ToggleRow label="Live-in (room & board provided)" value={liveIn} onChange={setLiveIn} />
            <div>
              <label className="label">Duties</label>
              <div className="flex flex-wrap gap-2">
                {DUTY_OPTIONS.map((d) => {
                  const on = duties.includes(d);
                  return (
                    <button key={d} onClick={() => setDuties(on ? duties.filter((x) => x !== d) : [...duties, d])} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${on ? 'bg-brand-600 text-white' : 'bg-sand text-muted'}`}>{d}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Day off</label>
              <select className="input" value={daysOff} onChange={(e) => setDaysOff(e.target.value)}>
                {['Sunday', 'Saturday', 'Monday', 'None (negotiable)'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <ToggleRow label="Require a guarantor (የስራ ዋስ / wastina)" value={guarantorRequired} onChange={setGuarantorRequired} />
          </div>
        )}

        <div>
          <label className="label">Sub-city</label>
          <select className="input" value={subCity} onChange={(e) => { setSubCity(e.target.value); setPin(null); }}>
            {subCities.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Location {pin && <span className="text-brand-600">· pinned</span>}</label>
          <MapView
            height={180}
            center={pin ?? subCities.find((s) => s.name === subCity) ?? undefined}
            onPick={(lat, lng) => setPin({ lat, lng })}
          />
        </div>

        {band && (
          <div className="info">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Fair-price band for {subCity}: <b>{etb(band.low)} – {etb(band.high)}</b>. Workers bid within range; you negotiate in chat.</span>
          </div>
        )}

        {/* Living-wage floor */}
        {floor > 0 && (
          <div className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${belowFloor ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-700'}`}>
            <Scale className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Living-wage floor: <b>{etb(floor)} {rateType}</b>{liveIn ? ' (live-in cash floor)' : ''}.
              {belowFloor ? ' Your price is below survival level — please raise it.' : ' Fair pay protects workers from exploitation.'}
            </span>
          </div>
        )}

        <div>
          <label className="label">Pricing</label>
          <div className="grid grid-cols-2 gap-2">
            {(['bid', 'fixed'] as const).map((m) => (
              <button key={m} onClick={() => setPricingMode(m)} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${pricingMode === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-white/70 bg-white/70 text-muted'}`}>
                {m === 'bid' ? 'Open to bids' : 'Fixed price'}
              </button>
            ))}
          </div>
          {pricingMode === 'fixed' && (
            <input className="input mt-2" inputMode="numeric" value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value.replace(/\D/g, ''))} placeholder={`Amount in ETB ${rateType !== 'fixed' ? `(${rateType})` : ''}`} />
          )}
        </div>

        {/* Transparent pricing (anti-delala) */}
        {fee && (
          <div className="rounded-2xl border border-brand-100 bg-white p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink"><ShieldCheck className="h-4 w-4 text-brand-600" /> Transparent pay — no broker cut</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">Worker keeps</span>
              <span className="font-extrabold text-brand-600">{etb(fee.amount)} (100%)</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted">Delala / broker commission</span>
              <span className="font-semibold text-ink">ETB 0</span>
            </div>
            <p className="mt-2 text-xs text-muted">You pay the worker directly via Telebirr/CBE Birr/cash. Serategna never holds your money — we're funded by a flat subscription, not a cut of wages.</p>
          </div>
        )}

        {postError && <p className="text-sm text-rose-600">{postError}</p>}
        {belowFloor && <p className="text-xs text-rose-600">Raise the price to at least {etb(floor)} to post.</p>}

        <button onClick={submit} disabled={busy || !title || !category || belowFloor} className="btn-brand w-full">
          <Check className="h-4 w-4" /> Post job
        </button>
        <p className="text-center text-xs text-muted">Funded by a flat employer subscription — workers keep 100% of their pay.</p>
      </div>

      {/* Category picker — searchable, scrollable list (scales past 20 groups) */}
      <Sheet open={catPicker} onClose={() => setCatPicker(false)} title="Choose a category">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input autoFocus className="input pl-9" placeholder="Search categories…" value={catQuery} onChange={(e) => setCatQuery(e.target.value)} />
        </div>
        <div className="mt-3 max-h-[55vh] space-y-1 overflow-y-auto no-scrollbar">
          {cats
            .filter((c) => {
              const q = catQuery.trim().toLowerCase();
              return !q || loc(c, lang).toLowerCase().includes(q) || c.en.toLowerCase().includes(q);
            })
            .map((c) => (
              <button
                key={c.key}
                onClick={() => { setCategory(c.key); setCatPicker(false); }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${category === c.key ? 'bg-brand-50' : 'bg-white'}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist text-brand-600"><CategoryIcon icon={c.icon} className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{loc(c, lang)}</span>
                {category === c.key && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            ))}
          {cats.filter((c) => { const q = catQuery.trim().toLowerCase(); return !q || loc(c, lang).toLowerCase().includes(q) || c.en.toLowerCase().includes(q); }).length === 0 && (
            <p className="py-6 text-center text-sm text-muted">No category matches “{catQuery}”.</p>
          )}
        </div>
      </Sheet>

      {/* Subscribe sheet */}
      <Sheet open={subSheet} onClose={() => setSubSheet(false)} title="Employer subscription">
        <p className="text-sm text-muted">Post up to <b>5 jobs / month</b>. A flat fee funds the platform — Serategna takes <b>no commission</b> on wages.</p>
        <div className="mt-4 space-y-2">
          <button onClick={() => subscribe('monthly')} className="card flex w-full items-center justify-between p-4 text-left">
            <div><p className="font-bold text-ink">Monthly</p><p className="text-xs text-muted">5 posts / month</p></div>
            <span className="text-lg font-extrabold text-brand-600">ETB 100<span className="text-xs font-normal text-muted">/mo</span></span>
          </button>
          <button onClick={() => subscribe('annual')} className="card flex w-full items-center justify-between p-4 text-left">
            <div><p className="font-bold text-ink">Annual <span className="rounded-full bg-feature px-2 py-0.5 text-[10px] text-ink">save 17%</span></p><p className="text-xs text-muted">5 posts / month, billed yearly</p></div>
            <span className="text-lg font-extrabold text-brand-600">ETB 1000<span className="text-xs font-normal text-muted">/yr</span></span>
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink">{label}</span>
      <button onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? 'bg-brand-600' : 'bg-sand'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
