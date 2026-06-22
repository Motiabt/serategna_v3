import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, Clock, Check, Upload } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function VerifyIdentity() {
  const nav = useNavigate();
  const { user, refreshUser } = useAuth();
  const [fayda, setFayda] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<any>('/api/identity/status').then(setStatus).catch(() => undefined);
  }, []);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await api.post('/api/identity/verify', { faydaNumber: fayda, docRef: 'doc_upload', selfieRef: 'selfie_upload' });
      await refreshUser();
      const s = await api.get<any>('/api/identity/status');
      setStatus(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const pending = user?.faydaStatus === 'pending' || status?.faydaStatus === 'pending';
  const verified = user?.faydaStatus === 'verified';

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <div className="flex items-center gap-3 px-5 pt-6">
        <button onClick={() => nav(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-ink">Fayda verification</h1>
      </div>

      <div className="px-5 pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-3 text-xl font-extrabold text-ink">
            {verified ? 'You are verified' : pending ? 'Verification in review' : 'Verify with Fayda'}
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Tier 1 unlocks withdrawals, the Verified badge and Score accrual — your Tier-0 jobs are retro-credited.
          </p>
        </div>
      </div>

      {verified ? (
        <div className="px-5 pt-8">
          <div className="card flex items-center gap-3 p-5 text-brand-700">
            <Check className="h-6 w-6" /> Identity confirmed — full platform access unlocked.
          </div>
        </div>
      ) : pending ? (
        <div className="px-5 pt-8">
          <div className="card flex items-center gap-3 p-5 text-amber-700">
            <Clock className="h-6 w-6" /> Under review (within 24h). Agent-assisted verification is available in your sub-city.
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-5 pt-8">
          <div>
            <label className="label">Fayda number</label>
            <input className="input" value={fayda} onChange={(e) => setFayda(e.target.value)} placeholder="FYD..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="card flex flex-col items-center gap-1 p-5 text-xs font-semibold text-muted">
              <Upload className="h-5 w-5 text-brand-600" /> Upload ID document
            </button>
            <button className="card flex flex-col items-center gap-1 p-5 text-xs font-semibold text-muted">
              <Upload className="h-5 w-5 text-brand-600" /> Take a selfie
            </button>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button onClick={submit} disabled={busy || fayda.length < 6} className="btn-brand w-full">
            Submit for verification
          </button>
          <p className="text-center text-xs text-muted">
            Reviewed against Fayda (MOSIP) — Proclamation 1284/2023. Data stays resident in Ethiopia.
          </p>
        </div>
      )}
    </div>
  );
}
