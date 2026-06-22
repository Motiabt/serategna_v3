import { useEffect, useState } from 'react';
import { CreditCard, ShieldCheck, Check, Lock, TrendingUp, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { etb } from '../lib/format';
import { useToast } from '../lib/toast';
import { Spinner } from '../components/ui';
import { BackHeader } from './_shared';

export function Credit() {
  const toast = useToast();
  const [d, setD] = useState<any>(null);
  const [applied, setApplied] = useState<string | null>(null);

  useEffect(() => { api.get<any>('/api/credit/me').then(setD).catch(() => setD({ error: true })); }, []);
  if (!d) return <Spinner label="Checking your credit readiness…" />;

  async function apply(product: string, amount: number) {
    await api.post('/api/credit/apply', { product, amount });
    setApplied(product);
    toast.success('Request sent — a partner lender will call you back.');
  }

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <BackHeader title="Credit & advances" />
      <div className="space-y-5 px-5 pt-2">
        {/* readiness hero */}
        <div className="hero p-5">
          <div className="flex items-center gap-2 text-sm text-white/70"><CreditCard className="h-4 w-4" /> Work-to-credit</div>
          {d.eligible ? (
            <>
              <p className="mt-2 text-xs text-white/70">You pre-qualify for up to</p>
              <p className="text-4xl font-extrabold tracking-tight">{etb(Math.max(d.maxLoan, d.maxAdvance))}</p>
              <p className="mt-1 text-xs text-white/70">Based on Score {d.score} · {etb(d.verifiedIncome)} verified income · {d.hasGuarantor ? 'guarantor-backed' : 'add a guarantor for more'}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-xl font-extrabold">Build a little more to unlock credit</p>
              <p className="mt-1 text-xs text-white/70">Your verified work history becomes borrowing power.</p>
            </>
          )}
        </div>

        {/* offers */}
        {d.eligible ? (
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
                <button onClick={() => apply(o.key, o.amount)} disabled={applied === o.key} className="btn-brand mt-3 w-full">
                  {applied === o.key ? <><Check className="h-4 w-4" /> Requested</> : <>Apply <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink"><Lock className="h-4 w-4 text-muted" /> To unlock credit</p>
            <ul className="mt-2 space-y-2 text-sm">
              {d.reasons?.map((r: string) => <li key={r} className="flex items-start gap-2 text-muted"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {r}</li>)}
            </ul>
          </div>
        )}

        {/* how it works */}
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink"><TrendingUp className="h-4 w-4 text-brand-600" /> How your work becomes credit</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">Every confirmed job adds to your verified income and Serategna Score. A licensed partner lender uses that record — and your guarantor (ዋስ) — to offer fair credit.</p>
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-[11px] text-brand-700"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {d.note}</p>
        </div>
      </div>
    </div>
  );
}
