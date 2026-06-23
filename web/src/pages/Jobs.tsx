import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, Layers, List, Gavel, Bookmark, Trash2, Clock } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { etb, closesIn } from '../lib/format';
import { useI18n, loc } from '../lib/i18n';
import { Spinner, EmptyState, Sheet, CardSkeletons } from '../components/ui';
import { CategoryIcon } from '../components/icons';
import { SwipeDeck } from '../components/SwipeDeck';
import { PageHeader } from './_shared';
import { JobRow, iconFor, EMP_KEY } from './Home';

interface Category { key: string; en: string; am: string; om: string; icon: string }

export function Jobs() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [cats, setCats] = useState<Category[]>([]);
  const [active, setActive] = useState<string>('all');
  const [feed, setFeed] = useState<any[] | null>(null);
  const [view, setView] = useState<'deck' | 'list'>('deck');
  const [bidTarget, setBidTarget] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMsg, setBidMsg] = useState('');
  const [bidBusy, setBidBusy] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidDone, setBidDone] = useState('');
  const [saved, setSaved] = useState<any[] | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  function loadSaved() {
    api.get<any[]>('/api/saved?kind=job').then((d) => { setSaved(d); setSavedCount(d.length); }).catch(() => setSaved([]));
  }
  useEffect(() => {
    api.get<Category[]>('/api/catalog/categories').then(setCats).catch(() => undefined);
    api.get<any[]>('/api/jobs/feed').then(setFeed).catch(() => setFeed([]));
    loadSaved();
  }, []);

  function openBid(j: any) {
    setBidTarget(j);
    setBidAmount(String(Math.round(((j.priceBandLow || 0) + (j.priceBandHigh || 0)) / 2) || ''));
    setBidMsg('');
    setBidError('');
  }
  async function submitBid() {
    setBidBusy(true);
    setBidError('');
    try {
      await api.post(`/api/jobs/${bidTarget.id}/bids`, { amount: Number(bidAmount), message: bidMsg });
      setBidDone(`${t('bidPlacedOn')} “${bidTarget.title}”`);
      setBidTarget(null);
      setTimeout(() => setBidDone(''), 2500);
    } catch (e) {
      setBidError(e instanceof ApiError ? e.message : t('failedToBid'));
    } finally {
      setBidBusy(false);
    }
  }
  async function saveJob(j: any) {
    const r = await api.post<{ saved: boolean }>('/api/saved', { kind: 'job', refId: j.id });
    setSavedCount((c) => (r.saved ? c + 1 : Math.max(0, c - 1)));
  }
  async function unsaveJob(id: string) {
    await api.post('/api/saved', { kind: 'job', refId: id });
    loadSaved();
  }

  const filtered = (feed ?? []).filter((j) => active === 'all' || j.category === active);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between px-5 pt-7">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{t('nearbyJobs')}</h1>
          <p className="text-sm text-muted">{t('swipeToBid')}</p>
        </div>
        <button onClick={() => { loadSaved(); setSavedOpen(true); }} className="btn relative flex h-11 w-11 items-center justify-center rounded-full bg-white p-0 text-ink shadow-card">
          <Bookmark className="h-4 w-4" />
          {savedCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">{savedCount}</span>}
        </button>
      </div>

      {bidDone && <div className="mx-5 mt-2 info">{bidDone}</div>}

      <div className="flex gap-2 px-5 pt-2">
        <Toggle active={view === 'deck'} onClick={() => setView('deck')} icon={<Layers className="h-3.5 w-3.5" />} label={t('swipe')} />
        <Toggle active={view === 'list'} onClick={() => setView('list')} icon={<List className="h-3.5 w-3.5" />} label={t('listView')} />
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-1 pt-2 no-scrollbar">
        <Chip label={t('allWord')} active={active === 'all'} onClick={() => setActive('all')} />
        {cats.map((c) => (
          <Chip key={c.key} label={loc(c, lang)} icon={c.icon} active={active === c.key} onClick={() => setActive(c.key)} />
        ))}
      </div>

      {feed === null ? (
        <div className="px-5 pt-3"><CardSkeletons count={4} /></div>
      ) : view === 'list' ? (
        <div className="flex-1 space-y-3 overflow-y-auto px-5 pt-3 no-scrollbar">
          {filtered.length === 0 ? (
            <EmptyState icon={<Briefcase className="h-6 w-6" />} title={t('noOpenJobs')} sub={t('widenRadiusProfile')} />
          ) : (
            filtered.map((j) => <JobRow key={j.id} job={j} onClick={() => nav(`/app/job/${j.id}`)} />)
          )}
        </div>
      ) : (
        <SwipeDeck
          items={filtered}
          keyOf={(j: any) => j.id}
          likeLabel={t('bidWord')}
          onLike={(j: any) => openBid(j)}
          onSkip={() => undefined}
          onDetails={(j: any) => nav(`/app/job/${j.id}`)}
          emptyTitle={t('noOpenJobsHere')}
          emptySub={t('widenRadiusCategory')}
          renderBack={(j: any) => (<><p className="mt-2 text-xs text-white/50">{j.subCity}</p><p className="text-xl font-bold">{j.title}</p></>)}
          renderFront={(j: any, h) => (
            <>
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/90 text-feature">
                  <CategoryIcon icon={iconFor(j.category)} className="h-6 w-6" />
                </span>
                <div className="flex items-center gap-2">
                  {j.employmentType && j.employmentType !== 'gig' && (
                    <span className="rounded-full bg-ink/85 px-3 py-1 text-xs font-bold text-feature">{EMP_KEY[j.employmentType] ? t(EMP_KEY[j.employmentType]) : j.employmentType}{j.positions > 1 ? ` · ${j.positions}` : ''}</span>
                  )}
                  <button onClick={() => saveJob(j)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/90 text-feature"><Bookmark className="h-4 w-4" /></button>
                </div>
              </div>
              <h2 className="mt-4 line-clamp-2 text-2xl font-extrabold leading-tight text-ink">{j.title}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink"><MapPin className="h-3 w-3" /> {j.subCity}{j.distanceKm != null ? ` · ${j.distanceKm} km` : ''}</span>
                <span className="rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink">{j.bidCount ?? 0} {t('bidsWord')}</span>
                <span className="rounded-full bg-ink/85 px-2.5 py-1 text-xs font-semibold text-feature">{j.matchScore}% {t('matchWord')}</span>
                {closesIn(j.expiresAt) && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-accent/15 px-2.5 py-1 text-xs font-semibold text-amber-accent"><Clock className="h-3 w-3" /> {closesIn(j.expiresAt)}</span>
                )}
              </div>
              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink/60">{j.clientName}</p>
                  <p className="text-2xl font-extrabold text-ink">{j.agreedPrice ? etb(j.agreedPrice) : `${etb(j.priceBandLow)}–${j.priceBandHigh}`}</p>
                  <p className="text-sm font-semibold text-ink/70">{t('fairPriceBand')}</p>
                </div>
                <button onClick={h.like} className="btn shrink-0 rounded-full bg-ink px-5 py-3 text-sm font-bold text-feature"><Gavel className="h-4 w-4" /> {t('bidWord')}</button>
              </div>
            </>
          )}
        />
      )}

      {/* One-tap quick bid */}
      <Sheet open={!!bidTarget} onClose={() => setBidTarget(null)} title={t('placeYourBid')}>
        {bidTarget && (
          <>
            <p className="mb-1 text-sm font-semibold text-ink">{bidTarget.title}</p>
            <p className="mb-3 text-xs text-muted">{t('fairPriceBand')}: {etb(bidTarget.priceBandLow)}–{bidTarget.priceBandHigh}</p>
            <label className="label">{t('yourPriceEtb')}</label>
            <input className="input text-lg font-bold" inputMode="numeric" value={bidAmount} onChange={(e) => setBidAmount(e.target.value.replace(/\D/g, ''))} />
            <label className="label mt-3">{t('messageOptional')}</label>
            <input className="input" value={bidMsg} onChange={(e) => setBidMsg(e.target.value)} placeholder={t('bidPlaceholder')} />
            {bidError && <p className="mt-2 text-sm text-rose-600">{bidError}</p>}
            <button onClick={submitBid} disabled={bidBusy || !bidAmount} className="btn-brand mt-4 w-full"><Gavel className="h-4 w-4" /> {t('submitBid')}</button>
          </>
        )}
      </Sheet>

      {/* Saved jobs (persisted) */}
      <Sheet open={savedOpen} onClose={() => setSavedOpen(false)} title={t('savedJobs')}>
        {saved === null ? <Spinner /> : saved.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t('savedJobsEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {saved.map((j) => (
              <div key={j.id} className="card flex items-center gap-3 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><CategoryIcon icon={iconFor(j.category)} /></span>
                <button onClick={() => { setSavedOpen(false); nav(`/app/job/${j.id}`); }} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-ink">{j.title}</p>
                  <p className="text-xs text-muted">{j.subCity} · {etb(j.priceBandLow)}–{j.priceBandHigh} · {j.status}</p>
                </button>
                <button onClick={() => unsaveJob(j.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-sand text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Toggle({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${active ? 'bg-ink text-white' : 'bg-white text-muted shadow-soft'}`}>
      {icon} {label}
    </button>
  );
}

function Chip({ label, icon, active, onClick }: { label: string; icon?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${active ? 'bg-ink text-white' : 'bg-white text-muted shadow-card'}`}
    >
      {icon && <CategoryIcon icon={icon} className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
