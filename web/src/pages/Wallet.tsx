import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ShieldCheck, Clock, PiggyBank, Pencil } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { etb, relTime } from '../lib/format';
import { useToast } from '../lib/toast';
import { Spinner, Sheet } from '../components/ui';
import { PageHeader } from './_shared';

export function Wallet() {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [sheet, setSheet] = useState(false);
  const [amount, setAmount] = useState('');
  const [dest, setDest] = useState<'telebirr' | 'bank'>('telebirr');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [score, setScore] = useState<any>(null);
  const [savings, setSavings] = useState<any>(null);
  const [savSheet, setSavSheet] = useState(false);
  const [savForm, setSavForm] = useState({ target: '', rate: '10' });
  const toast = useToast();
  const load = () =>
    api.get<any>('/api/wallet/me').then(setData).catch(() => setData({ error: true }));
  const loadSavings = () => api.get<any>('/api/savings').then(setSavings).catch(() => undefined);
  useEffect(() => {
    load();
    loadSavings();
    api.get<any>('/api/score/me').then(setScore).catch(() => undefined);
  }, []);

  async function saveSavings() {
    const g = await api.post<any>('/api/savings', { targetAmount: Number(savForm.target) || 0, ratePct: Number(savForm.rate) || 10, label: 'My iqub goal' });
    setSavings(g); setSavSheet(false); toast.success('Savings goal set');
  }

  async function withdraw() {
    setError('');
    setBusy(true);
    try {
      await api.post('/api/wallet/payouts', { amount: Number(amount), destination: dest });
      setSheet(false);
      setAmount('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <Spinner />;
  if (data.error)
    return <PageHeader title="Wallet" sub="Switch to Work mode to see your earnings ledger." />;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <PageHeader title="Verified income" sub="Paid directly to you · proof of earnings" />

      <div className="px-5 pt-2">
        <div className="hero overflow-hidden p-5">
          <p className="text-xs text-white/70">Verified income on Serategna</p>
          <p className="mt-1 text-4xl font-extrabold">{etb(score?.totalEarned ?? 0)}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-white/70">
            <span>{score?.jobsCompleted ?? 0} paid jobs</span>
            <span>·</span>
            <span>Score {score?.score ?? '—'}</span>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs text-white/90">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-feature" />
            <span>You're paid <b>directly</b> via Telebirr/CBE Birr/cash — Serategna never holds your money and takes no commission. This record is your portable income proof for credit.</span>
          </div>
          {(score?.jobsCompleted ?? 0) === 0 && (
            <button onClick={() => nav('/app/jobs')} className="mt-4 w-full rounded-2xl bg-white py-3 text-sm font-semibold text-brand-700">Find work to start earning</button>
          )}
        </div>
      </div>

      {/* Iqub-style auto-savings (notional) */}
      <div className="px-5 pt-5">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-ink"><PiggyBank className="h-4 w-4 text-brand-600" /> Iqub savings</h2>
            <button onClick={() => { setSavForm({ target: String(savings?.targetAmount ?? ''), rate: String(savings?.ratePct ?? 10) }); setSavSheet(true); }} className="flex items-center gap-1 text-xs font-semibold text-brand-700"><Pencil className="h-3 w-3" /> {savings ? 'Edit' : 'Set goal'}</button>
          </div>
          {savings && savings.targetAmount > 0 ? (
            <>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-2xl font-extrabold text-ink">{etb(savings.savedAmount)}</p>
                <p className="text-xs text-muted">of {etb(savings.targetAmount)}</p>
              </div>
              <div className="mt-2 bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, Math.round((savings.savedAmount / savings.targetAmount) * 100))}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{savings.ratePct}% of each confirmed payment is set aside automatically. Notional — your money stays with you; this builds a savings habit and record.</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Set a goal and Serategna sets aside a % of each payment you confirm — a digital iqub that also strengthens your credit profile.</p>
          )}
        </div>
      </div>

      <div className="px-5 pt-6">
        <h2 className="mb-3 text-base font-bold text-ink">Recent earnings</h2>
        <div className="space-y-2">
          {(data.earnings ?? []).length === 0 && (
            <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-card">No earnings yet — complete a job to start.</p>
          )}
          {(data.earnings ?? []).map((e: any) => (
            <div key={e.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{e.job}</p>
                <p className="text-xs text-muted">{relTime(e.postedAt)}</p>
              </div>
              <p className="text-sm font-bold text-brand-600">+{etb(e.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {(data.payouts ?? []).length > 0 && (
        <div className="px-5 pt-6">
          <h2 className="mb-3 text-base font-bold text-ink">Withdrawals</h2>
          <div className="space-y-2">
            {data.payouts.map((p: any) => (
              <div key={p.id} className="card flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold capitalize text-ink">{p.destination}</p>
                  <p className="text-xs text-muted">{relTime(p.createdAt)} · {p.status}</p>
                </div>
                <p className="text-sm font-bold text-ink">-{etb(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Withdraw earnings">
        <label className="label">Amount (max {etb(data.withdrawable)})</label>
        <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" />
        <label className="label mt-4">Destination</label>
        <div className="grid grid-cols-2 gap-2">
          {(['telebirr', 'bank'] as const).map((d) => (
            <button key={d} onClick={() => setDest(d)} className={`rounded-2xl border px-4 py-3 text-sm font-semibold capitalize ${dest === d ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-black/5 bg-sand text-muted'}`}>
              {d}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <button onClick={withdraw} className="btn-brand mt-5 w-full" disabled={busy || !amount}>
          Confirm withdrawal
        </button>
        <p className="mt-2 text-center text-xs text-muted">Sent to your own {dest} account — Serategna holds no stored value.</p>
      </Sheet>

      <Sheet open={savSheet} onClose={() => setSavSheet(false)} title="Iqub savings goal">
        <label className="label">Goal amount (ETB)</label>
        <input className="input" inputMode="numeric" value={savForm.target} onChange={(e) => setSavForm({ ...savForm, target: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 20000" />
        <label className="label mt-4">Set aside per payment</label>
        <div className="grid grid-cols-4 gap-2">
          {['5', '10', '20', '30'].map((r) => (
            <button key={r} onClick={() => setSavForm({ ...savForm, rate: r })} className={`rounded-2xl border px-2 py-2.5 text-sm font-semibold ${savForm.rate === r ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/5 bg-sand text-muted'}`}>{r}%</button>
          ))}
        </div>
        <button onClick={saveSavings} disabled={!savForm.target} className="btn-brand mt-5 w-full"><PiggyBank className="h-4 w-4" /> Save goal</button>
      </Sheet>
    </div>
  );
}
