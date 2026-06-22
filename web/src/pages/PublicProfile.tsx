import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Star, Briefcase, MapPin, BadgeCheck, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { etb } from '../lib/format';
import { Avatar, ScoreRing, Spinner } from '../components/ui';
import { BadgeRow } from '../components/Badges';

const WORK_STATUS: Record<string, { label: string; dot: string }> = {
  available: { label: 'Available now', dot: 'bg-emerald-500' },
  on_job: { label: 'On a job now', dot: 'bg-amber-accent' },
  employed: { label: 'Employed', dot: 'bg-feature' },
  offline: { label: 'Offline', dot: 'bg-white/40' },
};

export function PublicProfile() {
  const { id } = useParams();
  const [p, setP] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<any>(`/api/public/worker/${id}`).then(setP).catch(() => setErr('Profile not found'));
  }, [id]);

  if (err) return <Centered><p className="text-muted">{err}</p></Centered>;
  if (!p) return <Centered><Spinner label="Loading verified profile…" /></Centered>;

  return (
    <div className="min-h-screen bg-[#eef2f7] py-0 sm:py-8">
      <div className="mx-auto max-w-md bg-mesh">
        <div className="mesh min-h-screen sm:min-h-0 sm:rounded-[2rem] sm:shadow-float">
          {/* Hero */}
          <div className="hero m-3 p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-400" /> Serategna Verified
              </span>
              <span className="text-xs text-white/60">Income passport</span>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <Avatar name={p.name} size={64} />
              <div className="flex-1">
                <p className="text-2xl font-extrabold leading-tight">{p.name}</p>
                <p className="flex items-center gap-1 text-sm text-white/70"><MapPin className="h-3.5 w-3.5" /> {p.subCity}</p>
                {p.workStatus && WORK_STATUS[p.workStatus] && (
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                    <span className={`h-1.5 w-1.5 rounded-full ${WORK_STATUS[p.workStatus].dot}`} /> {WORK_STATUS[p.workStatus].label}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <Stat label="Score" value={p.score} />
              <Stat label="Jobs" value={p.jobsCompleted} />
              <Stat label="Rating" value={p.avgRating ? `${p.avgRating.toFixed(1)}★` : '—'} />
            </div>
          </div>

          <div className="space-y-4 p-4">
            {/* Verified income — the headline proof */}
            <div className="card p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <TrendingUp className="h-3.5 w-3.5 text-brand-600" /> Verified income (on-platform)
              </p>
              <p className="mt-1 text-3xl font-extrabold text-ink">{etb(p.verifiedIncome)}</p>
              <p className="mt-1 text-xs text-muted">Across {p.jobsCompleted} client-confirmed jobs. A real, portable income record.</p>
            </div>

            {/* Score ring */}
            <div className="card flex items-center gap-4 p-5">
              <ScoreRing score={p.score} band={p.band} size={104} />
              <div>
                <p className="text-sm font-bold capitalize text-ink">{p.band} Serategna Score</p>
                <p className="text-xs text-muted">A dynamic reliability & income score (300–850).</p>
                {p.badges?.length > 0 && <div className="mt-2"><BadgeRow badges={p.badges} /></div>}
              </div>
            </div>

            {/* Certifications & reliability */}
            {(p.certifications?.length > 0 || p.reliabilityIndex != null) && (
              <div className="card p-5">
                <p className="mb-2 text-sm font-bold text-ink">Verified credentials</p>
                {p.reliabilityIndex != null && (
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted">Reliability index</span>
                    <span className="font-bold text-brand-700">{p.reliabilityIndex}/100</span>
                  </div>
                )}
                {p.certifications?.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 border-t border-black/[0.05] py-2 text-sm first:border-0">
                    <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" />
                    <span className="text-ink">{c.name}</span>
                    <span className="ml-auto text-xs text-muted">{c.institution}{c.year ? ` · ${c.year}` : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {p.skills?.length > 0 && (
              <div className="card p-5">
                <p className="mb-2 text-sm font-bold text-ink">Skills & specializations</p>
                <div className="flex flex-wrap gap-2">
                  {p.skills.map((s: string) => <span key={s} className="pill bg-brand-50 text-brand-700">{s}</span>)}
                </div>
              </div>
            )}

            {/* Ratings */}
            {p.ratings?.length > 0 && (
              <div className="card p-5">
                <p className="mb-2 text-sm font-bold text-ink">What clients say</p>
                <div className="space-y-3">
                  {p.ratings.slice(0, 5).map((r: any, i: number) => (
                    <div key={i}>
                      <span className="flex">{Array.from({ length: r.stars }).map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-accent text-amber-accent" />)}</span>
                      {r.text && <p className="text-sm text-muted">{r.text}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted">
              <BadgeCheck className="h-4 w-4 text-brand-600" /> Verified by Serategna · ሰራተኛ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl bg-white/10 py-2">
      <p className="text-lg font-extrabold text-white">{value}</p>
      <p className="text-[10px] text-white/60">{label}</p>
    </div>
  );
}

function Centered({ children }: { children: any }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] p-6">{children}</div>;
}
