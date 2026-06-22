import { useEffect, useState } from 'react';
import { X, Star, Calendar, Check, Send, ThumbsDown, ListChecks, Sparkles, ShieldCheck, Phone } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { useI18n } from '../lib/i18n';
import { Spinner } from '../components/ui';

const STAGES = ['applied', 'shortlisted', 'interview', 'offer', 'hired', 'declined'] as const;
type Stage = (typeof STAGES)[number];
const STAGE_KEY: Record<Stage, string> = {
  applied: 'atsApplied', shortlisted: 'atsShortlisted', interview: 'atsInterview', offer: 'atsOffer', hired: 'atsHired', declined: 'atsDeclined',
};

// Full ATS pipeline for one job: shortlist → interview (schedule + notify) →
// offer/decline (notify) → onboarding checklist. Rendered as a web modal.
export function ApplicantsModal({ jobId, demoMode, onClose }: { jobId: string; demoMode: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | Stage>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [iv, setIv] = useState<{ id: string; when: string; mode: string; note: string } | null>(null);

  function load() { api.get<any>(`/api/enterprise/jobs/${jobId}/applicants`).then(setData).catch(() => setData({ applicants: [] })); }
  useEffect(load, [jobId]);

  async function move(id: string, stage: Stage, extra: Record<string, unknown> = {}) {
    setBusyId(id);
    try { await api.post(`/api/enterprise/applicants/${id}/stage`, { stage, ...extra }); toast.success(t('atsNotified')); load(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Failed'); }
    finally { setBusyId(null); }
  }
  function decline(a: any) { const note = prompt(t('declineReason')); if (note === null) return; move(a.id, 'declined', { note }); }
  function offer(a: any) { const note = prompt(t('offerMessage')) ?? ''; move(a.id, 'offer', { note }); }
  function submitInterview() {
    if (!iv) return;
    if (!iv.when) { toast.error(t('interviewWhen')); return; }
    move(iv.id, 'interview', { interviewAt: new Date(iv.when).toISOString(), interviewMode: iv.mode, note: iv.note });
    setIv(null);
  }
  async function toggleOnb(id: string, key: string, done: boolean) {
    try { await api.post(`/api/enterprise/applicants/${id}/onboarding`, { key, done }); load(); } catch { /* ignore */ }
  }
  async function seed() { try { await api.post(`/api/enterprise/jobs/${jobId}/seed-applicants`); load(); } catch { /* ignore */ } }

  const apps: any[] = data?.applicants ?? [];
  const counts = STAGES.reduce((m, s) => { m[s] = apps.filter((a) => a.stage === s).length; return m; }, {} as Record<string, number>);
  const shown = filter === 'all' ? apps : apps.filter((a) => a.stage === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="my-4 w-full max-w-2xl rounded-3xl bg-cream p-5 shadow-float" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-ink">{t('applicantsTitle')}</h2>
            {data?.job && <p className="text-xs text-muted">{data.job.title} · {data.job.filledPositions}/{data.job.positions} {t('filledWord')}</p>}
          </div>
          <button onClick={onClose} aria-label={t('close')} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-soft"><X className="h-4 w-4" /></button>
        </div>

        {/* Pipeline filter */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t('atsAll')} · {apps.length}</Chip>
          {STAGES.map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{t(STAGE_KEY[s] as any)} · {counts[s] ?? 0}</Chip>)}
        </div>

        {!data ? <div className="py-10"><Spinner /></div> : (
          <div className="mt-4 space-y-3">
            {apps.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-center shadow-card">
                <p className="text-sm text-muted">{t('noApplicantsYet')}</p>
                {demoMode && <button onClick={seed} className="btn-ghost mt-3"><Sparkles className="h-4 w-4" /> {t('seedDemoApplicants')}</button>}
              </div>
            )}
            {shown.map((a) => (
              <div key={a.id} className="rounded-2xl bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                      {a.name}
                      {a.tier >= 1 && <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />}
                    </p>
                    <p className="text-xs text-muted">
                      {a.subCity || '—'} · {a.jobsCompleted} jobs
                      {a.avgRating ? <> · <Star className="inline h-3 w-3 fill-amber-accent text-amber-accent" /> {a.avgRating.toFixed(1)}</> : null}
                      {a.score ? ` · score ${a.score}` : ''}
                    </p>
                    {a.skills?.length > 0 && <p className="mt-1 truncate text-[11px] text-muted">{a.skills.slice(0, 4).join(' · ')}</p>}
                    {a.message && <p className="mt-1 text-xs text-ink/80">“{a.message}”</p>}
                  </div>
                  <StageBadge stage={a.stage} label={t(STAGE_KEY[a.stage as Stage] as any)} />
                </div>

                {a.stage === 'interview' && a.interviewAt && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-accent-50 px-3 py-1.5 text-xs text-accent-700">
                    <Calendar className="h-3.5 w-3.5" /> {new Date(a.interviewAt).toLocaleString()} · {(a.interviewMode || 'in_person').replace('_', ' ')}
                  </p>
                )}

                {/* Interview scheduler (inline) */}
                {iv && iv.id === a.id ? (
                  <div className="mt-3 rounded-2xl bg-mist p-3">
                    <label className="label">{t('interviewWhen')}</label>
                    <input type="datetime-local" className="input" value={iv.when} onChange={(e) => setIv((p) => p && { ...p, when: e.target.value })} />
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(['in_person', 'phone', 'video'] as const).map((md) => (
                        <button key={md} onClick={() => setIv((p) => p && { ...p, mode: md })} className={`rounded-xl border px-2 py-2 text-xs font-semibold ${iv.mode === md ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-white/70 bg-white text-muted'}`}>
                          {t(md === 'in_person' ? 'modeInPerson' : md === 'phone' ? 'modePhone' : 'modeVideo')}
                        </button>
                      ))}
                    </div>
                    <input className="input mt-2" value={iv.note} onChange={(e) => setIv((p) => p && { ...p, note: e.target.value })} placeholder={t('messageOptional')} />
                    <div className="mt-2 flex gap-2">
                      <button onClick={submitInterview} className="btn-brand flex-1"><Send className="h-4 w-4" /> {t('emailInvite')}</button>
                      <button onClick={() => setIv(null)} className="btn-ghost">{t('cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* Call the applicant directly from the console (interview/offer step) */}
                    {a.phone && (a.stage === 'shortlisted' || a.stage === 'interview' || a.stage === 'offer') && (
                      <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 rounded-2xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-700"><Phone className="h-3.5 w-3.5" /> {t('callApplicant')}</a>
                    )}
                    {a.stage === 'applied' && (
                      <button disabled={busyId === a.id} onClick={() => move(a.id, 'shortlisted')} className="btn-brand px-3 py-2 text-xs"><Check className="h-3.5 w-3.5" /> {t('shortlistBtn')}</button>
                    )}
                    {(a.stage === 'applied' || a.stage === 'shortlisted') && (
                      <button disabled={busyId === a.id} onClick={() => setIv({ id: a.id, when: '', mode: 'in_person', note: '' })} className="btn-ghost px-3 py-2 text-xs"><Calendar className="h-3.5 w-3.5" /> {t('scheduleInterviewBtn')}</button>
                    )}
                    {a.stage === 'interview' && (
                      <button disabled={busyId === a.id} onClick={() => offer(a)} className="btn-brand px-3 py-2 text-xs"><Send className="h-3.5 w-3.5" /> {t('sendOfferBtn')}</button>
                    )}
                    {a.stage === 'offer' && (
                      <button disabled={busyId === a.id} onClick={() => move(a.id, 'hired')} className="btn-brand px-3 py-2 text-xs"><Check className="h-3.5 w-3.5" /> {t('markHiredBtn')}</button>
                    )}
                    {a.stage !== 'declined' && a.stage !== 'hired' && (
                      <button disabled={busyId === a.id} onClick={() => decline(a)} className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"><ThumbsDown className="h-3.5 w-3.5" /> {t('declineBtn')}</button>
                    )}
                  </div>
                )}

                {/* Onboarding checklist (offer/hired) */}
                {(a.stage === 'offer' || a.stage === 'hired') && a.onboarding?.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-brand-50/50 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-ink"><ListChecks className="h-3.5 w-3.5 text-brand-600" /> {t('onboardingTitle')}</p>
                    <div className="mt-2 space-y-1.5">
                      {a.onboarding.map((it: any) => (
                        <button key={it.key} onClick={() => toggleOnb(a.id, it.key, !it.done)} className="flex w-full items-center gap-2 text-left text-xs">
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${it.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-black/20 bg-white'}`}>{it.done && <Check className="h-3 w-3" />}</span>
                          <span className={it.done ? 'text-muted line-through' : 'text-ink'}>{it.key && t(it.key as any) !== it.key ? t(it.key as any) : it.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-ink text-white' : 'bg-white text-muted shadow-card'}`}>{children}</button>;
}
function StageBadge({ stage, label }: { stage: string; label: string }) {
  const tone: Record<string, string> = {
    applied: 'bg-mist text-muted', shortlisted: 'bg-accent-50 text-accent-700', interview: 'bg-amber-accent/15 text-amber-accent',
    offer: 'bg-brand-50 text-brand-700', hired: 'bg-emerald-500/15 text-emerald-700', declined: 'bg-rose-50 text-rose-600',
  };
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${tone[stage] ?? 'bg-mist text-muted'}`}>{label}</span>;
}
