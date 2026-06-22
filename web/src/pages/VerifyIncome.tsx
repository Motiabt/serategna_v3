import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Check, X, BadgeCheck, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { etb } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { BrandMark, Spinner } from '../components/ui';

// Lender-facing page: a worker hands a bank/MFI a code or link, the lender opens
// this, sees the verified report, and can confirm authenticity in one tap. The
// data is signed by Serategna — tamper-evident, consent-based, revocable.
export function VerifyIncome() {
  const { id } = useParams();
  const { t } = useI18n();
  const [data, setData] = useState<{ report: any; signature: string } | null>(null);
  const [err, setErr] = useState('');
  const [check, setCheck] = useState<null | { valid: boolean }>(null);

  useEffect(() => {
    api.get<{ report: any; signature: string }>(`/api/public/lending/${id}`)
      .then(setData)
      .catch(() => setErr(t('reportNotFound')));
  }, [id, t]);

  async function verify() {
    if (!data) return;
    const r = await api.post<{ valid: boolean }>('/api/public/lending/verify', { report: data.report, signature: data.signature });
    setCheck(r);
  }

  if (err) return <Centered><p className="text-muted">{err}</p></Centered>;
  if (!data) return <Centered><Spinner label={t('verifyIncomeTitle')} /></Centered>;

  const r = data.report;
  return (
    <div className="min-h-screen bg-[#eef2f7] py-6">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
            <div className="flex items-center gap-2.5">
              <BrandMark size={34} />
              <div>
                <p className="font-extrabold text-ink">Serategna</p>
                <p className="text-[11px] text-muted">{t('forLenders')}</p>
              </div>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">{t('signedTamperEvident')}</span>
          </div>

          <h1 className="mt-4 text-lg font-extrabold text-ink">{t('verifyIncomeTitle')}</h1>
          <p className="mt-0.5 text-sm text-muted">{r.subject.name} · {r.subject.subCity}</p>
          {r.subject.faydaVerified && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700"><BadgeCheck className="h-3.5 w-3.5" /> {t('verified')}</span>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label={t('verifiedTotalIncome')} value={etb(r.income.verifiedTotalETB)} />
            <Stat label={t('monthlyEstimate')} value={etb(r.income.monthlyEstimateETB)} />
            <Stat label={t('scoreTitle')} value={`${r.reliability.serategnaScore} (${r.reliability.band})`} />
            <Stat label={t('jobsCompletedLabel')} value={String(r.income.jobsCompleted)} />
            <Stat label={t('completionRateLabel')} value={`${Math.round((r.reliability.completionRate ?? 0) * 100)}%`} />
            <Stat label={t('disputeRateLabel')} value={`${Math.round((r.reliability.disputeRate ?? 0) * 100)}%`} />
          </div>

          <div className="mt-4 flex items-start gap-1.5 rounded-2xl bg-mist px-3 py-2 text-[11px] text-muted">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
            {t('memberSince')} {new Date(r.subject.memberSince).toLocaleDateString()} · {r.income.tenureMonths} mo · reliability {r.reliability.reliabilityIndex ?? '—'}/100
          </div>

          {check ? (
            <div className={`mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${check.valid ? 'bg-brand-50 text-brand-700' : 'bg-rose-50 text-rose-600'}`}>
              {check.valid ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              {check.valid ? t('reportAuthentic') : t('reportNotAuthentic')}
            </div>
          ) : (
            <button onClick={verify} className="btn-brand mt-4 w-full"><ShieldCheck className="h-4 w-4" /> {t('checkAuthenticity')}</button>
          )}

          <p className="mt-3 break-all text-center text-[10px] text-muted">{r.reportId} · {r.attestation.algo}</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-mist p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 text-base font-extrabold text-ink">{value}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] p-6">{children}</div>;
}
