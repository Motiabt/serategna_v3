import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Plus, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { etb, relTime } from '../lib/format';
import { Spinner, Sheet, Pill, EmptyState } from '../components/ui';
import { BackHeader } from './_shared';

const RELATIONSHIPS = ['family', 'employer', 'community', 'iddir'] as const;

export function Guarantors() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[] | null>(null);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relationship: 'family', amountCap: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdContract, setCreatedContract] = useState<string | null>(null);

  const load = () => api.get<any[]>('/api/guarantors/mine').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      const res = await api.post<any>('/api/guarantors', {
        name: form.name,
        phone: form.phone,
        relationship: form.relationship,
        amountCap: Number(form.amountCap || 0),
      });
      setCreatedContract(res.contract?.id ?? null);
      setSheet(false);
      setForm({ name: '', phone: '', relationship: 'family', amountCap: '' });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (items === null) return <Spinner />;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <BackHeader title="የስራ ዋስ · Work guarantor" />
      <p className="px-5 pt-1 text-sm text-muted">Ye-sera wastina (ዋስትና) — the Ethiopian legal surety where a guarantor takes responsibility, customarily required to hire a housemaid. Amount-capped (Commercial Code 1243/2021).</p>

      {createdContract && (
        <div className="mx-5 mt-3 info">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Guarantor agreement created. <button onClick={() => nav(`/app/contract/${createdContract}`)} className="font-semibold underline">View & share to sign</button></span>
        </div>
      )}

      <div className="space-y-3 px-5 pt-4">
        {items.length === 0 && (
          <EmptyState icon={<UserCheck className="h-6 w-6" />} title="No guarantors yet" sub="A guarantor strengthens your credit eligibility (Phase 2)." />
        )}
        {items.map((g) => (
          <div key={g.id} className="card flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><UserCheck className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">{g.name}</p>
              <p className="text-xs capitalize text-muted">{g.relationship} · cap {etb(g.amountCap)} · {relTime(g.createdAt)}</p>
            </div>
            <Pill tone={g.status === 'active' ? 'brand' : 'amber'}>{g.status}</Pill>
          </div>
        ))}
      </div>

      <div className="px-5 pt-4">
        <button onClick={() => setSheet(true)} className="btn-brand w-full"><Plus className="h-4 w-4" /> Add a guarantor</button>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Add a guarantor">
        <label className="label">Full name</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Guarantor's name" />
        <label className="label mt-3">Phone</label>
        <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+251…" inputMode="tel" />
        <label className="label mt-3">Relationship</label>
        <div className="grid grid-cols-4 gap-2">
          {RELATIONSHIPS.map((r) => (
            <button key={r} onClick={() => setForm({ ...form, relationship: r })} className={`rounded-2xl border px-2 py-2 text-xs font-semibold capitalize ${form.relationship === r ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-white/70 bg-white/70 text-muted'}`}>{r}</button>
          ))}
        </div>
        <label className="label mt-3">Guarantee cap (ETB)</label>
        <input className="input" inputMode="numeric" value={form.amountCap} onChange={(e) => setForm({ ...form, amountCap: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 5000" />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <button onClick={submit} disabled={busy || !form.name || !form.phone} className="btn-brand mt-4 w-full">Create agreement</button>
      </Sheet>
    </div>
  );
}
