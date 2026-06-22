import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Lock, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { ScoreRing, Spinner } from '../components/ui';
import { PageHeader } from './_shared';

const COMPONENT_META: Record<string, { label: string; weight: string }> = {
  transactionIntegrity: { label: 'Transaction integrity', weight: '35%' },
  earningsConsistency: { label: 'Earnings consistency', weight: '30%' },
  platformBehavior: { label: 'Platform behavior', weight: '20%' },
  relationshipCapital: { label: 'Relationship capital', weight: '15%' },
};

export function Score() {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get<any>('/api/score/me').then(setData).catch(() => setData({ error: true }));
  }, []);

  if (!data) return <Spinner />;
  if (data.error)
    return <PageHeader title="Score" sub="Switch to Work mode to see your Serategna Score." />;

  const eligible = data.score >= data.threshold;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <PageHeader title="Serategna Score" sub="Updated weekly · 300–850" />

      <div className="flex flex-col items-center px-5 pt-2">
        <ScoreRing score={data.score} band={data.band} />
        <p className="mt-4 max-w-[18rem] text-center text-sm text-accent-600">{data.projection}</p>
      </div>

      <div className="px-5 pt-6">
        <div className={`card flex items-center gap-3 p-4 ${eligible ? '' : 'opacity-95'}`}>
          {eligible ? (
            <CheckCircle2 className="h-8 w-8 text-brand-600" />
          ) : (
            <Lock className="h-8 w-8 text-muted" />
          )}
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">
              {eligible ? 'Credit-Eligible (Tier 2)' : `Reach ${data.threshold} to unlock credit`}
            </p>
            <p className="text-xs text-muted">
              Earned-wage access & nano-loans via Nisir MFI and partners.
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6">
        <h2 className="mb-3 text-base font-bold text-ink">What builds your score</h2>
        <div className="space-y-3">
          {Object.entries(data.components).map(([key, val]) => {
            const meta = COMPONENT_META[key];
            const pct = Math.round((val as number) * 100);
            return (
              <div key={key} className="card p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{meta?.label ?? key}</span>
                  <span className="text-xs text-muted">{meta?.weight} weight</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-right text-xs font-medium text-muted">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {data.history?.length > 1 && (
        <div className="px-5 pt-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
            <TrendingUp className="h-4 w-4 text-brand-600" /> Trend
          </h2>
          <Sparkline values={data.history.map((h: any) => h.score)} />
        </div>
      )}

      <div className="px-5 pt-6">
        <button onClick={() => nav('/app/wallet')} className="btn-ghost w-full">
          View earnings
        </button>
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 320;
  const h = 80;
  const min = Math.min(...values, 300);
  const max = Math.max(...values, 850);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  return (
    <div className="card p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" height={80}>
        <polyline points={pts} fill="none" stroke="#06b6d4" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
