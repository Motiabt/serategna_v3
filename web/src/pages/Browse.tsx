import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal, Star, MapPin, Briefcase, Heart, MessageCircle, ShieldCheck,
  Layers, Map as MapIcon, Bookmark, Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useI18n, loc } from '../lib/i18n';
import { Avatar, Spinner, Sheet, Pill } from '../components/ui';
import { CategoryIcon } from '../components/icons';
import { MapView } from '../components/MapView';
import { SwipeDeck } from '../components/SwipeDeck';
import { BadgeRow } from '../components/Badges';
import { useToast } from '../lib/toast';

interface Category { key: string; en: string; am: string; om: string; icon: string }
interface TaxGroup { key: string; roles: { k: string; en: string; am: string; om: string }[] }

export function Browse() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxGroup[]>([]);
  const [category, setCategory] = useState('home_cleaning');
  const [role, setRole] = useState('');
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [workers, setWorkers] = useState<any[] | null>(null);
  const [view, setView] = useState<'cards' | 'map'>('cards');
  const [filters, setFilters] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [shortlist, setShortlist] = useState<any[] | null>(null);
  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  function loadShortlist() {
    api.get<any[]>('/api/saved?kind=worker').then((d) => { setShortlist(d); setSavedCount(d.length); }).catch(() => setShortlist([]));
  }
  useEffect(() => { loadShortlist(); }, []);

  async function saveWorker(w: any) {
    const r = await api.post<{ saved: boolean }>('/api/saved', { kind: 'worker', refId: w.userId });
    setSavedCount((c) => (r.saved ? c + 1 : Math.max(0, c - 1)));
    toast.success(r.saved ? `${w.name?.split(' ')[0]} ${t('addedToShortlist')}` : t('removedFromShortlist'));
  }
  async function unsave(userId: string) {
    await api.post('/api/saved', { kind: 'worker', refId: userId });
    loadShortlist();
  }

  useEffect(() => {
    api.get<Category[]>('/api/catalog/categories').then(setCats).catch(() => undefined);
    api.get<TaxGroup[]>('/api/catalog/taxonomy').then(setTaxonomy).catch(() => undefined);
  }, []);
  useEffect(() => {
    setWorkers(null);
    const q = new URLSearchParams({ category });
    if (role) q.set('role', role);
    if (femaleOnly) q.set('femaleClientOnly', 'true');
    api.get<any[]>(`/api/workers?${q.toString()}`).then(setWorkers).catch(() => setWorkers([]));
  }, [category, role, femaleOnly]);

  const roleLabel = (key?: string) => {
    if (!key) return '';
    for (const g of taxonomy) { const r = g.roles.find((x) => x.k === key); if (r) return loc(r, lang); }
    return '';
  };
  const catLabel = (key?: string) => { const c = cats.find((x) => x.key === key); return c ? loc(c, lang) : ''; };
  const activeCat = cats.find((c) => c.key === category);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between px-5 pt-7">
        <h1 className="text-3xl font-extrabold leading-none text-ink">{t('search')}<br />{t('workersWord')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadShortlist(); setShortlistOpen(true); }} className="btn relative flex h-11 w-11 items-center justify-center rounded-full bg-white p-0 text-ink shadow-card">
            <Bookmark className="h-4 w-4" />
            {savedCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">{savedCount}</span>}
          </button>
          <button onClick={() => setFilters(true)} className="btn flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-card">
            <SlidersHorizontal className="h-4 w-4" /> {t('filtersWord')}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between px-5 pb-1 pt-2 text-xs">
        <span className="font-medium text-muted">{role ? roleLabel(role) : loc(activeCat, lang)}</span>
        <span className="text-muted">{workers ? `${workers.length} ${t('resultsWord')}` : '…'}</span>
      </div>

      <div className="flex gap-2 px-5 pt-2">
        <Toggle active={view === 'cards'} onClick={() => setView('cards')} icon={<Layers className="h-3.5 w-3.5" />} label={t('cardsWord')} />
        <Toggle active={view === 'map'} onClick={() => setView('map')} icon={<MapIcon className="h-3.5 w-3.5" />} label={t('mapWord')} />
      </div>

      {workers === null ? (
        <Spinner />
      ) : view === 'map' ? (
        <div className="px-5 pt-3">
          <MapView height={420} markers={workers.filter((w) => w.lat).map((w) => ({ lat: w.lat, lng: w.lng, label: w.name?.split(' ')[0], kind: 'worker' as const }))} />
        </div>
      ) : (
        <SwipeDeck
          items={workers}
          keyOf={(w: any) => w.userId}
          onLike={(w: any) => saveWorker(w)}
          onSkip={() => undefined}
          onDetails={(w: any) => setDetail(w)}
          likeLabel={t('saveToShortlist')}
          emptyTitle={t('noMoreWorkers')}
          emptySub={t('tryDifferentFilters')}
          renderBack={(w: any) => (<><p className="mt-2 text-xs text-white/50">{w.subCity}</p><p className="text-xl font-bold">{w.name}</p></>)}
          renderFront={(w: any, h) => (
            <>
              <div className="flex items-start justify-between">
                <Avatar name={w.name} size={48} />
                <div className="flex gap-2">
                  <button onClick={h.like} className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/90 text-feature"><Heart className="h-4 w-4" /></button>
                  <button onClick={() => setDetail(w)} className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/90 text-feature"><MessageCircle className="h-4 w-4" /></button>
                </div>
              </div>
              <h2 className="mt-4 line-clamp-2 text-2xl font-extrabold text-ink">{w.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1 text-xs font-semibold text-white"><Star className="h-3 w-3 fill-feature text-feature" /> {w.avgRating?.toFixed(1) ?? '—'}</span>
                <span className="flex items-center gap-1 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink"><MapPin className="h-3 w-3" /> {w.subCity}</span>
                <span className="flex items-center gap-1 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink"><Briefcase className="h-3 w-3" /> {w.jobsCompleted} {t('jobsLower')}</span>
                {w.tier >= 1 && <span className="rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink">{t('verified')}</span>}
              </div>
              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink/60">{roleLabel(w.roles?.[0]) || catLabel(w.categories?.[0])}</p>
                  <p className="text-2xl font-extrabold capitalize text-ink">{w.band}</p>
                  <p className="text-sm font-semibold text-ink/70">{t('score')} {w.score} · {w.matchScore}% {t('matchWord')}</p>
                </div>
                <button onClick={() => setDetail(w)} className="btn shrink-0 rounded-full bg-ink px-5 py-3 text-sm font-bold text-feature">{t('seeDetails')}</button>
              </div>
            </>
          )}
        />
      )}

      <Sheet open={filters} onClose={() => setFilters(false)} title={t('filtersWord')}>
        <label className="label">{t('category')}</label>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c.key} onClick={() => { setCategory(c.key); setRole(''); }} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${category === c.key ? 'bg-ink text-white' : 'bg-white text-muted shadow-soft'}`}>
              <CategoryIcon icon={c.icon} className="h-3.5 w-3.5" /> {loc(c, lang)}
            </button>
          ))}
        </div>
        <label className="label mt-4">{t('specialization')}</label>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">{t('anyIn')} {loc(activeCat, lang)}</option>
          {(taxonomy.find((g) => g.key === category)?.roles ?? []).map((r) => (
            <option key={r.k} value={r.k}>{loc(r, lang)}</option>
          ))}
        </select>
        <button onClick={() => setFemaleOnly(!femaleOnly)} className="mt-4 flex w-full items-center justify-between">
          <span className="text-sm text-ink">{t('verifiedFemaleOnly')}</span>
          <span className={`relative h-6 w-11 rounded-full transition ${femaleOnly ? 'bg-brand-600' : 'bg-sand'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${femaleOnly ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
        <button onClick={() => setFilters(false)} className="btn-brand mt-5 w-full">{t('showWord')} {workers?.length ?? 0} {t('workersWord')}</button>
      </Sheet>

      <Sheet open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <div>
            <div className="flex items-center gap-3">
              <Avatar name={detail.name} size={56} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-lg font-bold text-ink">{detail.name}</p>
                  {detail.tier >= 1 && <ShieldCheck className="h-4 w-4 text-brand-600" />}
                </div>
                <p className="text-xs text-muted">{roleLabel(detail.roles?.[0]) || catLabel(detail.categories?.[0])} · {detail.subCity}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-brand-600">{detail.score}</p>
                <p className="text-[10px] capitalize text-muted">{detail.band}</p>
              </div>
            </div>
            {detail.matchScore != null && (
              <div className="mt-3 rounded-2xl bg-brand-50 px-3 py-2">
                <p className="text-xs font-semibold text-brand-700">{detail.matchScore}% {t('matchWord')} · {t('whyThisRank')}</p>
                {detail.matchReasons?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {detail.matchReasons.map((r: string) => (
                      <span key={r} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-ink shadow-soft">{r}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {detail.badges?.length > 0 && <div className="mt-3"><BadgeRow badges={detail.badges} /></div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="amber"><Star className="h-3 w-3" /> {detail.avgRating?.toFixed(1) ?? '—'}</Pill>
              <Pill><Briefcase className="h-3 w-3" /> {detail.jobsCompleted} {t('jobsLower')}</Pill>
              {detail.distanceKm != null && <Pill tone="sky"><MapPin className="h-3 w-3" /> {detail.distanceKm} km</Pill>}
              {detail.femaleClientOnly && <Pill tone="rose">{t('femaleClients')}</Pill>}
            </div>
            <button onClick={() => window.open(`/p/${detail.userId}`, '_blank')} className="btn-ghost mt-3 w-full text-sm">{t('viewPublicProfile')}</button>
            {(detail.roles?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.roles.map((rk: string) => <span key={rk} className="pill bg-brand-50 text-brand-700">{roleLabel(rk)}</span>)}
              </div>
            )}
            <button onClick={() => { setDetail(null); nav('/app/post'); }} className="btn-brand mt-5 w-full">{t('postAndInvite')}</button>
          </div>
        )}
      </Sheet>

      {/* Shortlist (saved workers, persisted) */}
      <Sheet open={shortlistOpen} onClose={() => setShortlistOpen(false)} title={t('yourShortlist')}>
        {shortlist === null ? <Spinner /> : shortlist.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t('shortlistEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {shortlist.map((w) => (
              <div key={w.userId} className="card flex items-center gap-3 p-3">
                <Avatar name={w.name} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{w.name}</p>
                  <p className="text-xs text-muted">{roleLabel(w.roles?.[0]) || catLabel(w.categories?.[0])} · {w.subCity} · {w.score}</p>
                </div>
                <button onClick={() => { setShortlistOpen(false); nav('/app/post'); }} className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">{t('hireWord')}</button>
                <button onClick={() => unsave(w.userId)} className="flex h-8 w-8 items-center justify-center rounded-full bg-sand text-rose-600"><Trash2 className="h-4 w-4" /></button>
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
