import { useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, ArrowRight, ArrowDownToLine, Search, Plus, MapPin, Star, ChevronRight, ShieldCheck, Clock, Flame, Target, Zap, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n, loc } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { etb, dualDate, closesIn } from '../lib/format';
import { touchStreak, getWeekGoal, setWeekGoal, thisWeekEarnings, daysLeftInWeek } from '../lib/engagement';
import { Avatar, BrandMark, Pill, Spinner, SectionTitle } from '../components/ui';
import { CategoryIcon, GROUP_ICON } from '../components/icons';
import { MapView } from '../components/MapView';
import { ModeSwitch } from './_shared';

interface Category { key: string; en: string; am: string; om: string; icon: string }

export function Home() {
  const { mode } = useAuth();
  return mode === 'worker' ? <WorkerHome /> : <ClientHome />;
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle theme" className="glass-pill flex h-9 w-9 items-center justify-center text-white">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function MiniProp({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-4 w-4" /></span>
      <span className="text-[10px] font-medium text-muted">{label}</span>
    </div>
  );
}

function NotifBell() {
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    api.get<{ unread: number }>('/api/notifications/unread-count').then((d) => setUnread(d.unread)).catch(() => undefined);
  }, []);
  return (
    <button onClick={() => nav('/app/notifications')} className="glass-pill relative flex h-9 w-9 items-center justify-center text-white">
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-feature px-1 text-[9px] font-bold text-ink">{unread}</span>
      )}
    </button>
  );
}

function HeroHeader({
  greeting,
  bigLabel,
  bigValue,
  sub,
  actions,
}: {
  greeting: string;
  bigLabel: string;
  bigValue: ReactNode;
  sub?: string;
  actions: { label: string; icon: any; onClick: () => void; primary?: boolean }[];
}) {
  const { user } = useAuth();
  return (
    <div className="px-4 pt-5">
      <div className="hero p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <div>
              <p className="text-xs text-white/70">{greeting}</p>
              <p className="text-base font-bold leading-tight">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotifBell />
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs text-white/70">{bigLabel}</p>
          <div className="mt-1 text-4xl font-extrabold tracking-tight">{bigValue}</div>
          {sub && <p className="mt-1 text-xs text-white/70">{sub}</p>}
        </div>

        <div className="mt-5 flex gap-2.5">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-95 ${
                a.primary ? 'bg-white text-brand-700' : 'border border-white/20 bg-white/10 text-white backdrop-blur'
              }`}
            >
              <a.icon className="h-4 w-4" /> {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModeRow() {
  return (
    <div className="flex items-center justify-between px-5 pt-4">
      <p className="flex items-center gap-1 text-xs text-muted">{dualDate()}</p>
      <ModeSwitch />
    </div>
  );
}

function CategoryGrid({ cats, onPick }: { cats: Category[]; onPick: (key: string) => void }) {
  const { t, lang } = useI18n();
  return (
    <div className="px-5 pt-5">
      <SectionTitle>{t('categories')}</SectionTitle>
      <div className="grid grid-cols-4 gap-2.5">
        {cats.slice(0, 8).map((c) => (
          <button key={c.key} onClick={() => onPick(c.key)} className="tile">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CategoryIcon icon={c.icon} className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-medium leading-tight text-ink">{loc(c, lang).split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Engagement strip — the daily habit loop (behavioural economics):
//  · Streak (loss aversion / consistency bias) — recorded on every home visit.
//  · Weekly goal (goal-gradient + commitment device) — progress accelerates pull.
//  · Fresh matched jobs (variable reward + FOMO) — a different number each visit.
//  · Points-to-Credit-Eligible (near-miss toward a high-value goal).
// All client-side, localized, no network cost beyond data already loaded.
// ─────────────────────────────────────────────────────────────────────────────
function EngagementStrip({ score, wallet, feedCount, onFind }: { score: any; wallet: any; feedCount: number; onFind: () => void }) {
  const { t } = useI18n();
  const [streak] = useState(() => touchStreak()); // records today's check-in → builds the streak
  const [goal, setGoal] = useState(() => getWeekGoal());
  const earned = thisWeekEarnings(wallet?.earnings);
  const daysLeft = daysLeftInWeek();
  const pct = goal > 0 ? Math.min(100, Math.round((earned / goal) * 100)) : 0;
  const gap = Math.max(0, (score?.threshold ?? 0) - (score?.score ?? 0));

  function editGoal() {
    const raw = prompt(t('enterWeekGoal'), goal ? String(goal) : '5000');
    if (raw === null) return;
    const n = Math.max(0, Math.round(Number(raw) || 0));
    setWeekGoal(n); setGoal(n);
  }

  return (
    <div className="px-4 pt-3">
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {/* Streak — loss aversion */}
        <div className="card flex min-w-[9.5rem] shrink-0 flex-col gap-0.5 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-accent/15 text-amber-accent"><Flame className="h-5 w-5" /></span>
          <p className="mt-1 text-2xl font-extrabold leading-none text-ink">{streak.count}</p>
          <p className="text-xs font-semibold text-muted">{t('dayStreak')}</p>
          <p className="text-[11px] font-semibold text-brand-600">{t('streakKeepGoing')}</p>
        </div>

        {/* Weekly goal — goal-gradient / commitment device */}
        <button onClick={editGoal} className="card flex min-w-[12rem] shrink-0 flex-col gap-0.5 p-4 text-left active:scale-[0.99]">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Target className="h-5 w-5" /></span>
            <span className="text-[11px] font-semibold text-muted">{daysLeft} {t('daysLeft')}</span>
          </div>
          {goal > 0 ? (
            <>
              <p className="mt-1 text-sm font-bold text-ink">{etb(earned)} <span className="text-muted">/ {etb(goal)}</span></p>
              <div className="bar-track mt-1"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
              <p className="text-[11px] font-semibold text-brand-600">{pct >= 100 ? t('goalReached') : pct >= 80 ? t('almostThere') : `${pct}% ${t('ofGoal')}`}</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-bold text-ink">{t('weeklyGoal')}</p>
              <p className="text-[11px] font-semibold text-brand-600">{t('setWeeklyGoal')} →</p>
            </>
          )}
        </button>

        {/* Fresh matched jobs — variable reward + FOMO */}
        <button onClick={onFind} className="card flex min-w-[11rem] shrink-0 flex-col gap-0.5 p-4 text-left active:scale-[0.99]">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-50 text-accent-700"><Zap className="h-5 w-5" /></span>
          <p className="mt-1 text-2xl font-extrabold leading-none text-ink">{feedCount}</p>
          <p className="text-xs font-semibold text-muted">{t('newJobsForYou')}</p>
          <p className="text-[11px] font-semibold text-brand-600">{t('peopleHiringNow')}</p>
        </button>

        {/* Near-miss toward Credit-Eligible — progress to a high-value goal */}
        {gap > 0 && (
          <div className="card flex min-w-[10.5rem] shrink-0 flex-col gap-0.5 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700"><TrendingUp className="h-5 w-5" /></span>
            <p className="mt-1 text-2xl font-extrabold leading-none text-ink">{gap}</p>
            <p className="text-xs font-semibold text-muted">{t('ptsToCreditEligible')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkerHome() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get<any>('/api/score/me'),
      api.get<any>('/api/wallet/me'),
      api.get<any[]>('/api/jobs/feed'),
      api.get<Category[]>('/api/catalog/categories'),
    ])
      .then(([score, wallet, feed, cats]) => setData({ score, wallet, feed, cats }))
      .catch(() => setData({ error: true }));
  }, []);

  if (!data) return <Spinner />;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <ModeRow />
      <HeroHeader
        greeting={t('goodDay')}
        bigLabel={t('verifiedIncome')}
        bigValue={etb(data.score?.totalEarned ?? 0)}
        sub={`${data.score?.jobsCompleted ?? 0} ${t('paidJobs')} · ${t('score')} ${data.score?.score} · ${t('paidDirectly')}`}
        actions={[
          { label: t('myIncome'), icon: ArrowDownToLine, onClick: () => nav('/app/wallet'), primary: true },
          { label: t('findWork'), icon: Search, onClick: () => nav('/app/jobs') },
        ]}
      />

      {/* Score strip */}
      <div className="px-4 pt-3">
        <button onClick={() => nav('/app/score')} className="card flex w-full items-center justify-between p-4 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-brand-50">
              <span className="text-lg font-extrabold leading-none text-brand-700">{data.score?.score}</span>
            </div>
            <div>
              <p className="text-sm font-bold capitalize text-ink">{data.score?.band} {t('scoreWord')}</p>
              <p className="text-xs text-muted">{data.score?.projection}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </button>
      </div>

      <EngagementStrip score={data.score} wallet={data.wallet} feedCount={(data.feed ?? []).length} onFind={() => nav('/app/jobs')} />

      <CategoryGrid cats={data.cats ?? []} onPick={() => nav('/app/jobs')} />

      <div className="px-5 pt-6">
        <SectionTitle action={<button className="text-xs font-semibold text-brand-700" onClick={() => nav('/app/jobs')}>{t('viewAll')}</button>}>
          {t('nearbyJobs')}
        </SectionTitle>
        {(data.feed ?? []).some((j: any) => j.lat) && (
          <div className="mb-3">
            <MapView
              height={150}
              markers={(data.feed ?? []).filter((j: any) => j.lat).slice(0, 8).map((j: any) => ({ lat: j.lat, lng: j.lng, label: undefined, kind: 'job' as const }))}
            />
          </div>
        )}
        <div className="space-y-3">
          {(data.feed ?? []).slice(0, 4).map((j: any) => (
            <JobRow key={j.id} job={j} onClick={() => nav(`/app/job/${j.id}`)} />
          ))}
          {(data.feed ?? []).length === 0 && <p className="card p-4 text-sm text-muted">{t('noNearbyJobs')}</p>}
        </div>
      </div>
    </div>
  );
}

function ClientHome() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/api/jobs/mine?as=client'),
      api.get<any[]>('/api/workers?category=cleaning'),
      api.get<Category[]>('/api/catalog/categories'),
    ])
      .then(([mine, workers, cats]) => setData({ mine, workers, cats }))
      .catch(() => setData({ error: true }));
  }, []);

  if (!data) return <Spinner />;
  const active = (data.mine ?? []).filter((j: any) => !['confirmed', 'cancelled'].includes(j.status));
  const featured = (data.workers ?? [])[0];

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <ModeRow />
      <HeroHeader
        greeting={t('goodMorning')}
        bigLabel={t('activeJobsToday')}
        bigValue={<>{String(active.length).padStart(2, '0')}<span className="text-2xl text-white/50"> / {(data.mine ?? []).length}</span></>}
        sub={t('payDirectlyNote')}
        actions={[
          { label: t('post'), icon: Plus, onClick: () => nav('/app/post'), primary: true },
          { label: t('browse'), icon: Search, onClick: () => nav('/app/browse') },
        ]}
      />

      {/* Headline: trusted permanent housemaids (the delala fix) */}
      <div className="px-4 pt-4">
        <button onClick={() => nav('/app/post?preset=housemaid')} className="card w-full overflow-hidden p-0 text-left">
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{t('permanentHousemaids')}</p>
            <p className="mt-0.5 text-xl font-extrabold leading-tight">{t('hireTrustedHousemaid')}</p>
            <p className="mt-1 text-sm text-white/85">{t('housemaidPitch')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 p-4 text-center">
            <MiniProp icon={Star} label={t('vettedRated')} />
            <MiniProp icon={ShieldCheck} label={t('guarantor')} />
            <MiniProp icon={ArrowRight} label={t('noBrokerFee')} />
          </div>
        </button>
      </div>

      <CategoryGrid cats={data.cats ?? []} onPick={() => nav('/app/post')} />

      {featured && (
        <div className="px-5 pt-6">
          <SectionTitle action={<button className="text-xs font-semibold text-brand-700" onClick={() => nav('/app/browse')}>{t('viewAll')}</button>}>
            {t('topRatedNearYou')}
          </SectionTitle>
          <button onClick={() => nav('/app/browse')} className="card flex w-full items-center gap-3 p-4 text-left">
            <Avatar name={featured.name} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{featured.name}</p>
              <p className="flex items-center gap-1 truncate text-xs capitalize text-muted">
                <MapPin className="h-3 w-3 shrink-0" /> {featured.subCity} · {featured.categories?.[0]}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="flex items-center justify-end gap-0.5 text-sm font-bold text-ink"><Star className="h-3.5 w-3.5 fill-amber-accent text-amber-accent" /> {featured.avgRating?.toFixed(1)}</p>
              <p className="text-xs font-semibold text-brand-600">{featured.score}</p>
            </div>
          </button>
        </div>
      )}

      <div className="px-5 pt-6">
        <SectionTitle action={<button className="text-xs font-semibold text-brand-700" onClick={() => nav('/app/orders')}>{t('viewAll')}</button>}>
          {t('activeJobs')}
        </SectionTitle>
        <div className="space-y-3">
          {active.slice(0, 4).map((j: any) => (
            <JobRow key={j.id} job={j} onClick={() => nav(`/app/job/${j.id}`)} showStatus />
          ))}
          {active.length === 0 && <p className="card p-4 text-sm text-muted">{t('noActiveJobs')}</p>}
        </div>
      </div>
    </div>
  );
}

export function JobRow({ job, onClick, showStatus }: { job: any; onClick?: () => void; showStatus?: boolean }) {
  const { t } = useI18n();
  const pct = job.priceBandHigh ? Math.min(100, Math.round(((job.agreedPrice ?? job.priceBandLow) / job.priceBandHigh) * 100)) : 40;
  return (
    <button onClick={onClick} className="card w-full p-4 text-left active:scale-[0.99]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <CategoryIcon icon={iconFor(job.category)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{job.title}</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3 w-3" /> {job.subCity}
            {job.distanceKm != null && ` · ${job.distanceKm} km`}
            {job.bidCount != null && ` · ${job.bidCount} ${t('bidsWord')}`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {job.company && (
              <span className="inline-flex max-w-[10rem] items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold text-ink">
                {job.company.logoUrl && <img src={job.company.logoUrl} alt="" className="h-3.5 w-3.5 shrink-0 rounded-full object-cover" />}
                <span className="truncate">{job.company.name}</span>
              </span>
            )}
            {job.employmentType && job.employmentType !== 'gig' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-semibold text-accent-700">
                {EMP_KEY[job.employmentType] ? t(EMP_KEY[job.employmentType]) : job.employmentType}
                {job.positions > 1 && ` · ${job.positions} ${t('workersWord')}`}
              </span>
            )}
            {closesIn(job.expiresAt) && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${closesIn(job.expiresAt) === 'Closed' ? 'bg-rose-50 text-rose-600' : 'bg-amber-accent/10 text-amber-accent'}`}>
                <Clock className="h-2.5 w-2.5" /> {closesIn(job.expiresAt)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          {job.agreedPrice ? (
            <span className="badge-dark">{etb(job.agreedPrice)}</span>
          ) : (
            <p className="text-xs font-semibold text-ink">{etb(job.priceBandLow)}–{job.priceBandHigh}</p>
          )}
          {showStatus && <p className="mt-1 text-[10px] capitalize text-brand-600">{job.status}</p>}
        </div>
      </div>
      <div className="mt-3 bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}

export function iconFor(cat: string) {
  return GROUP_ICON[cat] ?? 'briefcase';
}

// Employment-type → i18n key, so job-type badges localize with the UI.
export const EMP_KEY: Record<string, 'empGig' | 'empShortTerm' | 'empContract' | 'empPermanent' | 'empGroupHire'> = {
  gig: 'empGig', short_term: 'empShortTerm', contract: 'empContract', permanent: 'empPermanent', group_hire: 'empGroupHire',
};
