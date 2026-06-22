import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Layers, Briefcase, Plus, ShieldCheck, Crown, Check, Star, MapPin, X, ListChecks } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { useI18n, loc } from '../lib/i18n';
import { Spinner, Sheet, ThemeToggle } from '../components/ui';
import { CategoryIcon } from '../components/icons';
import { PageHeader } from './_shared';
import { ApplicantsModal } from './EnterpriseApplicants';

interface Cat { key: string; en: string; am: string; om: string; icon: string }

export function EnterpriseConsole() {
  const nav = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [me, setMe] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [talent, setTalent] = useState<any[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatOpen, setSeatOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [seat, setSeat] = useState({ phone: '', title: '' });
  const [job, setJob] = useState({ category: '', title: '', positions: 1, rateType: 'monthly' });
  const [busy, setBusy] = useState(false);
  const [applyJobId, setApplyJobId] = useState<string | null>(null); // open ATS pipeline

  function load() {
    Promise.all([
      api.get<any>('/api/enterprise/me'),
      api.get<any[]>('/api/enterprise/jobs').catch(() => []),
      api.get<any[]>('/api/enterprise/talent').catch(() => []),
      api.get<Cat[]>('/api/catalog/categories').catch(() => []),
    ]).then(([m, j, tl, c]) => {
      setMe(m); setJobs(j); setTalent(tl); setCats(c);
      if (c[0] && !job.category) setJob((s) => ({ ...s, category: c[0].key }));
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function addSeat() {
    setBusy(true);
    try {
      await api.post('/api/enterprise/members', { phone: seat.phone, title: seat.title });
      toast.success(t('grantRoleAccess'));
      setSeatOpen(false); setSeat({ phone: '', title: '' }); load();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not add seat'); }
    finally { setBusy(false); }
  }
  async function postRole() {
    setBusy(true);
    try {
      const r = await api.post<any>('/api/enterprise/bulk-post', { jobs: [{ category: job.category, title: job.title, positions: Number(job.positions), employmentType: Number(job.positions) > 1 ? 'group_hire' : 'permanent', rateType: job.rateType }] });
      toast.success(`${t('postRole')} · ${r.count}`);
      setPostOpen(false); setJob((s) => ({ ...s, title: '', positions: 1 })); load();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not post'); }
    finally { setBusy(false); }
  }
  async function removeMember(id: string) {
    if (!confirm(t('removeSeatConfirm'))) return;
    try { await api.del(`/api/enterprise/members/${id}`); toast.success(t('remove')); load(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not remove'); }
  }
  async function closeJob(id: string) {
    if (!confirm(t('closePostingConfirm'))) return;
    try { await api.post(`/api/enterprise/jobs/${id}/close`); toast.success(t('close')); load(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not close'); }
  }

  if (loading) return <Spinner label={t('loading')} />;
  if (!me?.enterprise) {
    return (
      <div className="h-full overflow-y-auto pb-6 no-scrollbar">
        <PageHeader title={t('enterprise')} />
        <div className="px-5">
          <div className="card p-6 text-center">
            <Building2 className="mx-auto h-8 w-8 text-brand-600" />
            <p className="mt-2 font-bold text-ink">{t('noEnterpriseAccount')}</p>
            <p className="mt-1 text-sm text-muted">{t('enterpriseProvisioned')}</p>
            <button onClick={() => nav('/enterprises')} className="btn-brand mt-4">{t('seeEnterprisePackages')}</button>
          </div>
        </div>
      </div>
    );
  }

  const e = me.enterprise;
  const isAdmin = me.role === 'admin';
  const demoMode = import.meta.env.DEV || e.status !== 'active';

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <PageHeader title={t('enterpriseConsole')} sub={e.name} />
      <div className="space-y-5 px-5">
        {/* Account card */}
        <div className="card p-5">
          <div className="flex items-center gap-3">
            {e.logoUrl ? <img src={e.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-black/[0.05]" /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Building2 className="h-6 w-6" /></div>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{e.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Crown className="h-3 w-3 text-brand-600" /> {e.packageName} {t('planLabel')}
                <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">{e.status}</span>
              </p>
            </div>
            <ThemeToggle className="shrink-0" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[[t('seatsLabel'), `${me.seatsUsed}/${e.seats}`], [t('talentPoolLabel'), me.talentCount], [t('postedLabel'), me.posts]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-mist p-3"><p className="text-lg font-extrabold text-ink">{v as any}</p><p className="text-[10px] text-muted">{l as string}</p></div>
            ))}
          </div>
          {e.agreementRef && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> {e.agreementRef} · {t('agreementProvisioned')}</p>}
        </div>

        {/* Seats / members */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-ink"><Users className="h-4 w-4 text-brand-600" /> {t('teamAndRoles')}</h2>
            {isAdmin && <button onClick={() => setSeatOpen(true)} disabled={me.seatsUsed >= e.seats} className="flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> {t('addSeat')}</button>}
          </div>
          <div className="card divide-y divide-black/5 overflow-hidden">
            {me.members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-bold text-ink">{(m.name ?? '?')[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{m.name}</p>
                  <p className="truncate text-xs text-muted">{m.title || (m.role === 'admin' ? t('accountAdmin') : t('managerRole'))}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${m.role === 'admin' ? 'bg-ink text-white' : 'bg-brand-50 text-brand-700'}`}>{m.role === 'admin' ? t('accountAdmin') : t('managerRole')}</span>
                {isAdmin && m.role !== 'admin' && (
                  <button onClick={() => removeMember(m.id)} aria-label={t('remove')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand text-rose-600"><X className="h-3.5 w-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Posted jobs + bulk post — each card opens the ATS pipeline (web hiring) */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-ink"><Briefcase className="h-4 w-4 text-brand-600" /> {t('postedRoles')}</h2>
            <button onClick={() => setPostOpen(true)} className="flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" /> {t('postRole')}</button>
          </div>
          <div className="space-y-2">
            {jobs.length === 0 && <p className="card p-4 text-sm text-muted">{t('noRolesYet')}</p>}
            {jobs.map((j) => (
              <div key={j.id} className="card flex items-center gap-3 p-3">
                <button onClick={() => setApplyJobId(j.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><CategoryIcon icon={iconFor(j.category, cats)} className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{j.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      {j.positions > 1 ? `${j.filledPositions}/${j.positions} ${t('filledWord')} · ` : ''}
                      <ListChecks className="h-3 w-3 text-brand-600" /> {j.bidCount} {t('applicantsCount')}
                    </p>
                  </div>
                </button>
                {j.status === 'open' ? (
                  <button onClick={() => closeJob(j.id)} className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-[10px] font-semibold text-rose-600">{t('close')}</button>
                ) : (
                  <span className="shrink-0 rounded-full bg-mist px-2.5 py-1 text-[10px] font-semibold capitalize text-ink">{j.status}</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Talent pool */}
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-base font-bold text-ink"><Layers className="h-4 w-4 text-brand-600" /> {t('privateTalentPool')}</h2>
          <div className="space-y-2">
            {talent.length === 0 && <p className="card p-4 text-sm text-muted">{t('talentPoolEmpty')}</p>}
            {talent.map((tp) => (
              <button key={tp.workerId} onClick={() => nav(`/p/${tp.workerId}`)} className="card flex w-full items-center gap-3 p-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-bold text-ink">{(tp.name ?? '?')[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{tp.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted"><MapPin className="h-3 w-3 shrink-0" /> {tp.subCity} · {tp.jobsCompleted} {t('jobsCompletedLabel')}</p>
                </div>
                <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-ink"><Star className="h-3.5 w-3.5 fill-amber-accent text-amber-accent" /> {tp.avgRating?.toFixed(1) ?? '—'}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ATS pipeline modal — shortlist → interview → offer → hire, on the web */}
      {applyJobId && <ApplicantsModal jobId={applyJobId} demoMode={demoMode} onClose={() => { setApplyJobId(null); load(); }} />}

      {/* Add seat sheet */}
      <Sheet open={seatOpen} onClose={() => setSeatOpen(false)} title={t('provisionSeat')}>
        <p className="text-sm text-muted">{t('provisionSeatHelp')}</p>
        <label className="label mt-3">{t('theirPhone')}</label>
        <input className="input" value={seat.phone} onChange={(ev) => setSeat({ ...seat, phone: ev.target.value })} placeholder="+251…" />
        <label className="label mt-3">{t('titleOptional')}</label>
        <input className="input" value={seat.title} onChange={(ev) => setSeat({ ...seat, title: ev.target.value })} placeholder="e.g. Site supervisor" />
        <button onClick={addSeat} disabled={busy || seat.phone.length < 7} className="btn-brand mt-4 w-full"><ShieldCheck className="h-4 w-4" /> {t('grantRoleAccess')}</button>
      </Sheet>

      {/* Post role sheet */}
      <Sheet open={postOpen} onClose={() => setPostOpen(false)} title={t('postRole')}>
        <label className="label">{t('category')}</label>
        <select className="input" value={job.category} onChange={(ev) => setJob({ ...job, category: ev.target.value })}>
          {cats.map((c) => <option key={c.key} value={c.key}>{loc(c, lang)}</option>)}
        </select>
        <label className="label mt-3">{t('roleTitle')}</label>
        <input className="input" value={job.title} onChange={(ev) => setJob({ ...job, title: ev.target.value })} placeholder="e.g. Night shift cleaners" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('positions')}</label>
            <input type="number" min={1} max={50} className="input" value={job.positions} onChange={(ev) => setJob({ ...job, positions: Number(ev.target.value) })} />
          </div>
          <div>
            <label className="label">{t('payRate')}</label>
            <select className="input" value={job.rateType} onChange={(ev) => setJob({ ...job, rateType: ev.target.value })}>
              {['monthly', 'weekly', 'daily', 'hourly'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted"><Check className="h-3 w-3 text-brand-600" /> {t('minWageNote')}</p>
        <button onClick={postRole} disabled={busy || job.title.length < 2} className="btn-brand mt-4 w-full"><Plus className="h-4 w-4" /> {t('postRole')}</button>
      </Sheet>
    </div>
  );
}

function iconFor(cat: string, cats: Cat[]) {
  return cats.find((c) => c.key === cat)?.icon ?? 'briefcase';
}
