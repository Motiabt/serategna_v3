import { useEffect, useState } from 'react';
import { Award, Plus, CheckCircle2, Clock, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { relTime } from '../lib/format';
import { Spinner, Sheet, EmptyState } from '../components/ui';
import { useToast } from '../lib/toast';
import { BackHeader } from './_shared';

export function Certifications() {
  const toast = useToast();
  const [items, setItems] = useState<any[] | null>(null);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ name: '', institution: '', refNo: '', year: '' });
  const [busy, setBusy] = useState(false);

  const load = () => api.get<any[]>('/api/credentials/certifications/mine').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  async function submit() {
    setBusy(true);
    try {
      await api.post('/api/credentials/certifications', form);
      toast.success('Submitted for verification');
      setSheet(false);
      setForm({ name: '', institution: '', refNo: '', year: '' });
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (items === null) return <Spinner />;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <BackHeader title="Certifications" />
      <p className="px-5 pt-1 text-sm text-muted">Add skills certificates (TVET, colleges, institutions). Verified ones boost your Score and trust.</p>

      <div className="space-y-3 px-5 pt-4">
        {items.length === 0 && <EmptyState icon={<Award className="h-6 w-6" />} title="No certifications yet" sub="Add one to stand out to employers." />}
        {items.map((c) => (
          <div key={c.id} className="card flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Award className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
              <p className="text-xs text-muted">{c.institution}{c.year ? ` · ${c.year}` : ''} · {relTime(c.createdAt)}</p>
            </div>
            {c.status === 'verified' ? <span className="pill bg-brand-50 text-brand-700"><CheckCircle2 className="h-3 w-3" /> Verified</span>
              : c.status === 'rejected' ? <span className="pill bg-rose-50 text-rose-600"><X className="h-3 w-3" /> Rejected</span>
              : <span className="pill bg-amber-accent/15 text-amber-accent"><Clock className="h-3 w-3" /> Pending</span>}
          </div>
        ))}
      </div>

      <div className="px-5 pt-4">
        <button onClick={() => setSheet(true)} className="btn-brand w-full"><Plus className="h-4 w-4" /> Add certification</button>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Add a certification">
        <label className="label">Certificate name</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Housekeeping Level II" />
        <label className="label mt-3">Issuing institution</label>
        <input className="input" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. Addis TVET College" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div><label className="label">Reference no.</label><input className="input" value={form.refNo} onChange={(e) => setForm({ ...form, refNo: e.target.value })} placeholder="optional" /></div>
          <div><label className="label">Year</label><input className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" /></div>
        </div>
        <button onClick={submit} disabled={busy || !form.name || !form.institution} className="btn-brand mt-4 w-full">Submit for verification</button>
        <p className="mt-2 text-center text-xs text-muted">Reviewed against the issuing institution before it shows as Verified.</p>
      </Sheet>
    </div>
  );
}
