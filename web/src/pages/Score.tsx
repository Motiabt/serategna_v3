import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Lock, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { ScoreRing, Spinner } from '../components/ui';
import { PageHeader } from './_shared';

const COMPONENT_META: Record<string, { labelKey: 'scTransaction' | 'scEarnings' | 'scPlatform' | 'scRelationship'; weight: string }> = {
  transactionIntegrity: { labelKey: 'scTransaction', weight: '35%' },
  earningsConsistency: { labelKey: 'scEarnings', weight: '30%' },
  platformBehavior: { labelKey: 'scPlatform', weight: '20%' },
  relationshipCapital: { labelKey: 'scRelationship', weight: '15%' },
};

export function Score() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get<any>('/api/score/me').then(setData).catch(() => setData({ error: true }));
  }, []);

  if (!data) return <Spinner />;
  if (data.error)
    return <PageHeader title={t('score')} sub={t('switchToWorkScore')} />;

  const eligible = data.score >= data.threshold;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <PageHeader title={t('scoreTitle')} sub={t('updatedWeekly')} />

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
              {eligible ? t('creditEligibleTier2') : `${t('reachWord')} ${data.threshold} ${t('toUnlockCredit')}`}
            </p>
            <p className="text-xs text-muted">
              {t('earnedWageAccess')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6">
        <h2 className="mb-3 text-base font-bold text-ink">{t('whatBuildsScore')}</h2>
        <div className="space-y-3">
          {Object.entries(data.components).map(([key, val]) => {
            const meta = COMPONENT_META[key];
            const pct = Math.round((val as number) * 100);
            return (
              <div key={key} className="card p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{meta ? t(meta.labelKey) : key}</span>
                  <span className="text-xs text-muted">{meta?.weight} {t('weightWord')}</span>
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
            <TrendingUp className="h-4 w-4 text-brand-600" /> {t('trendWord')}
          </h2>
          <Sparkline values={data.history.map((h: any) => h.score)} />
        </div>
      )}

      <div className="px-5 pt-6">
        <button onClick={() => nav('/app/wallet')} className="btn-ghost w-full">
          {t('viewEarnings')}
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
