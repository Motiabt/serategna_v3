import { useEffect, useState } from 'react';
import { CreditCard, ShieldCheck, Check, Lock, TrendingUp, ArrowRight, Zap, Wallet } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { etb } from '../lib/format';
import { useToast } from '../lib/toast';
import { useI18n } from '../lib/i18n';
import { Spinner } from '../components/ui';
import { BackHeader } from './_shared';

export function Credit() {
  const toast = useToast();
  const { t } = useI18n();
  const [d, setD] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  function load() {
    api.get<any>('/api/credit/me').then(setD).catch(() => setD({ error: true }));
    api.get<any>('/api/credit/advance').then((q) => { setQuote(q); setAmount(q.maxAdvance || 0); }).catch(() => undefined);
  }
  useEffect(load, []);
  if (!d) return <Spinner label={t('checkingCredit')} />;

  async function apply(product: string, amt: number) {
    await api.post('/api/credit/apply', { product, amount: amt });
    setApplied(product);
    toast.success(t('requestSentCallback'));
  }

  async function takeAdvance() {
    setBusy(true);
    try {
      await api.post('/api/credit/advance/accept', { amount });
      toast.success(t('advanceSentToast'));
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('failedWord'));
    } finally {
      setBusy(false);
    }
  }

  const active = d.activeAdvance;
  const fee = Math.round(amount * (quote?.feeRate ?? 0.04));
  const repaidPct = active ? Math.round(((active.total - active.outstanding) / active.total) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <BackHeader title={t('creditAndAdvances')} />
      <div className="space-y-5 px-5 pt-2">
        {/* readiness hero */}
        <div className="hero p-5">
          <div className="flex items-center gap-2 text-sm text-white/70"><CreditCard className="h-4 w-4" /> {t('workToCredit')}</div>
          {d.eligible ? (
            <>
              <p className="mt-2 text-xs text-white/70">{t('preQualifyUpTo')}</p>
              <p className="text-4xl font-extrabold tracking-tight">{etb(Math.max(d.maxLoan, d.maxAdvance))}</p>
              <p className="mt-1 text-xs text-white/70">{t('basedOnScore')} {d.score} · {etb(d.verifiedIncome)} {t('verifiedIncomeWord')} · {d.hasGuarantor ? t('guarantorBacked') : t('addGuarantorMore')}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-xl font-extrabold">{t('buildMoreUnlock')}</p>
              <p className="mt-1 text-xs text-white/70">{t('workHistoryBorrowing')}</p>
            </>
          )}
        </div>

        {/* ACTIVE advance — outstanding balance + auto-repay progress */}
        {active && (
          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-2 bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-3 text-white">
              <Zap className="h-4 w-4" />
              <p className="text-sm font-bold">{t('activeAdvanceTitle')}</p>
            </div>
            <div className="p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted">{t('outstandingBalance')}</p>
                  <p className="text-3xl font-extrabold text-ink">{etb(active.outstanding)}</p>
                </div>
                <p className="text-xs text-muted">{repaidPct}% · {etb(active.total)}</p>
              </div>
              <div className="mt-2 bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, repaidPct)}%` }} /></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-2xl bg-mist p-2"><p className="font-bold text-ink">{etb(active.principal)}</p><p className="text-[10px] text-muted">{t('borrowedWord')}</p></div>
                <div className="rounded-2xl bg-mist p-2"><p className="font-bold text-ink">{etb(active.fee)}</p><p className="text-[10px] text-muted">{t('feeWord2')}</p></div>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> {t('repaysAutomatically')}</p>
            </div>
          </div>
        )}

        {/* TAKE an advance — the earned-wage product (only when eligible & none active) */}
        {!active && quote?.eligible && (
          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink"><Wallet className="h-4 w-4 text-brand-600" /> {t('earnedWageAdvance')}</p>
            <p className="mt-0.5 text-xs text-muted">{t('advanceTagline')}</p>

            <div className="mt-3 flex items-center justify-between">
              <label className="label mb-0">{t('advanceAmountLabel')}</label>
              <span className="text-[11px] text-muted">{t('maxToday')}: {etb(quote.maxAdvance)}</span>
            </div>
            <p className="mt-1 text-2xl font-extrabold text-ink">{etb(amount)}</p>
            <input
              type="range" min={quote.minAdvance} max={quote.maxAdvance} step={100} value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full accent-brand-600"
            />

            <div className="mt-3 space-y-1.5 rounded-2xl bg-mist p-3 text-sm">
              <Row label={t('youReceive')} value={etb(amount)} strong />
              <Row label={`${t('flatFee')} (${Math.round((quote.feeRate ?? 0.04) * 100)}%)`} value={etb(fee)} />
              <div className="my-1 border-t border-black/[0.06]" />
              <Row label={t('totalRepay')} value={etb(amount + fee)} strong />
            </div>

            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> {t('repaidFromNext')}</p>
            <button onClick={takeAdvance} disabled={busy || amount < quote.minAdvance} className="btn-brand mt-3 w-full">
              <Zap className="h-4 w-4" /> {t('getAdvanceNow')}
            </button>
          </div>
        )}

        {/* indicative partner offers (referral) */}
        {d.eligible && d.offers?.length > 0 && (
          <div className="space-y-3">
            {d.offers.map((o: any) => (
              <div key={o.key} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{o.name}</p>
                    <p className="text-xs text-muted">{o.term} · {o.rate}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{o.partner}</p>
                  </div>
                  <p className="shrink-0 text-xl font-extrabold text-brand-700">{etb(o.amount)}</p>
                </div>
                <button onClick={() => apply(o.key, o.amount)} disabled={applied === o.key} className="btn-ghost mt-3 w-full">
                  {applied === o.key ? <><Check className="h-4 w-4" /> {t('requestedWord')}</> : <>{t('applyWord')} <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* not eligible → reasons */}
        {!d.eligible && (
          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink"><Lock className="h-4 w-4 text-muted" /> {t('toUnlockCreditTitle')}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {d.reasons?.map((r: string) => <li key={r} className="flex items-start gap-2 text-muted"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {r}</li>)}
            </ul>
          </div>
        )}

        {/* how it works */}
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink"><TrendingUp className="h-4 w-4 text-brand-600" /> {t('howWorkBecomesCredit')}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t('howWorkBecomesCreditBody')}</p>
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-[11px] text-brand-700"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {d.note}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={strong ? 'font-extrabold text-ink' : 'font-semibold text-ink'}>{value}</span>
    </div>
  );
}
