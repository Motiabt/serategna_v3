import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, PenLine } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { relTime } from '../lib/format';
import { Spinner, Sheet, Pill } from '../components/ui';
import { BackHeader } from './_shared';

export function ContractDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [c, setC] = useState<any>(null);
  const [sheet, setSheet] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get<any>(`/api/contracts/${id}`).then(setC).catch(() => setError('Not found'));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return (<><BackHeader title="Contract" /><p className="p-6 text-muted">{error}</p></>);
  if (!c) return <Spinner />;

  const mySig = (c.signatures ?? []).find((s: any) => s.userId === user?.id);

  async function requestCode() {
    setError('');
    setBusy(true);
    try {
      const res = await api.post<{ devCode?: string }>('/api/auth/otp/request', { phone: user!.phone });
      setDevCode(res.devCode ?? null);
      if (res.devCode) setCode(res.devCode);
      setSheet(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    setError('');
    setBusy(true);
    try {
      await api.post(`/api/contracts/${id}/sign`, { code });
      setSheet(false);
      setCode('');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <BackHeader title="Contract" />
      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3 no-scrollbar">
        <div className="mb-3 flex items-center gap-2">
          {c.status === 'signed' ? <Pill tone="brand"><CheckCircle2 className="h-3 w-3" /> Fully signed</Pill> : <Pill tone="amber">{c.status}</Pill>}
        </div>

        <article className="card p-5">
          {renderMarkdown(c.bodyMarkdown)}
        </article>

        <div className="info mt-3">
          <span>This is a <b>consensus record</b>. Sign the binding legal contract in person — for housemaids, with the guarantor present (kebele/court-attested recommended).</span>
        </div>
        <button onClick={() => window.print()} className="btn-ghost mt-3 w-full">Print agreement for in-person signing</button>

        <div className="mt-4 card p-4">
          <h3 className="mb-2 text-sm font-bold text-ink">Signatures</h3>
          {(c.signatures ?? []).length === 0 && <p className="text-xs text-muted">No signatures yet.</p>}
          {(c.signatures ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between border-t border-black/5 py-2 text-sm first:border-0">
              <span className="font-medium text-ink">{s.signerName} <span className="text-xs capitalize text-muted">({s.role})</span></span>
              <span className="flex items-center gap-1 text-xs text-brand-600"><CheckCircle2 className="h-3.5 w-3.5" /> {relTime(s.signedAt)}</span>
            </div>
          ))}
        </div>
      </div>

      {!mySig && c.status !== 'signed' && (
        <div className="shrink-0 border-t border-black/5 bg-white/90 px-5 py-4 backdrop-blur">
          {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
          <button onClick={requestCode} disabled={busy} className="btn-brand w-full">
            <PenLine className="h-4 w-4" /> Sign with one-time code
          </button>
        </div>
      )}
      {mySig && <div className="shrink-0 px-5 py-4 text-center text-sm text-brand-600">You signed this contract ✓</div>}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Digital signature">
        <p className="text-sm text-muted">Enter the 6-digit code sent to {user?.phone}. This is your binding e-signature (Proclamation 1205/2020).</p>
        <input className="input mt-3 text-center text-2xl font-bold tracking-[0.4em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" inputMode="numeric" />
        {devCode && <p className="mt-2 rounded-2xl bg-brand-50 px-3 py-2 text-center text-xs text-brand-700">Dev code: <b>{devCode}</b></p>}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <button onClick={sign} disabled={busy || code.length !== 6} className="btn-brand mt-4 w-full">Sign contract</button>
      </Sheet>
    </div>
  );
}

// minimal markdown renderer for headings / bullets / bold
function renderMarkdown(md: string) {
  return md.split('\n').map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={i} className="mb-2 text-lg font-extrabold text-ink">{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={i} className="mb-1 mt-3 text-sm font-bold text-ink">{line.slice(3)}</h2>;
    if (line.trim().startsWith('•')) return <p key={i} className="ml-3 text-sm text-muted">{line}</p>;
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: bold(line) }} />;
  });
}
function bold(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
