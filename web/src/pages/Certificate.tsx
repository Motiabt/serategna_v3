import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { etb } from '../lib/format';
import { BrandMark, Spinner } from '../components/ui';

// Public, printable Employment & Income Certificate — a verifiable document a
// worker can hand to a landlord, lender, embassy or employer. The QR resolves
// to the live public passport so anyone can confirm it is genuine.
export function Certificate() {
  const { id } = useParams();
  const [p, setP] = useState<any>(null);
  const [v, setV] = useState<any>(null);

  useEffect(() => {
    api.get<any>(`/api/public/worker/${id}`).then(setP).catch(() => setP({ error: true }));
    api.get<any>(`/api/public/verify/${id}`).then(setV).catch(() => undefined);
  }, [id]);

  if (!p) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (p.error) return <div className="flex min-h-screen items-center justify-center text-muted">Certificate not found.</div>;

  const url = typeof window !== 'undefined' ? `${window.location.origin}/p/${id}` : '';
  const issued = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const since = p.memberSince ? new Date(p.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-[#eef2f7] py-6 print:bg-white print:py-0">
      {/* toolbar (hidden when printing) */}
      <div className="mx-auto mb-4 flex max-w-[800px] items-center justify-between px-4 print:hidden">
        <span className="text-sm text-muted">Employment &amp; Income Certificate</span>
        <button onClick={() => window.print()} className="btn-brand px-4 py-2 text-sm"><Printer className="h-4 w-4" /> Download / Print</button>
      </div>

      {/* the document */}
      <div className="mx-auto max-w-[800px] bg-white p-10 shadow-card print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-black/10 pb-5">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <p className="text-lg font-extrabold text-ink">Serategna</p>
              <p className="text-xs text-muted">Verified Employment &amp; Income Certificate</p>
            </div>
          </div>
          <div className="text-right text-xs text-muted">
            <p>Issued {issued}</p>
            {v?.code && <p className="font-semibold text-ink">Ref {v.code}</p>}
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-slate">
          This certifies that <b className="text-ink">{p.name}</b> is a verified member of the Serategna platform
          {p.verified ? ' with a Fayda-verified identity' : ''}, with the work and income record below, accrued from completed and
          client-confirmed engagements.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Verified income', etb(p.verifiedIncome)],
            ['Jobs completed', String(p.jobsCompleted ?? 0)],
            ['Serategna Score', `${p.score} (${p.band})`],
            ['Member since', since],
          ].map(([l, val]) => (
            <div key={l} className="rounded-2xl bg-mist p-4">
              <p className="text-[11px] text-muted">{l}</p>
              <p className="mt-0.5 text-lg font-extrabold text-ink">{val}</p>
            </div>
          ))}
        </div>

        {p.skills?.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Skills</p>
            <p className="mt-1 text-sm text-slate">{p.skills.join(' · ')}</p>
          </div>
        )}
        {p.certifications?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Verified certifications</p>
            <ul className="mt-1 text-sm text-slate">
              {p.certifications.map((c: any) => <li key={c.name}>• {c.name}{c.institution ? ` — ${c.institution}` : ''}{c.year ? ` (${c.year})` : ''}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-8 flex items-end justify-between border-t border-black/10 pt-5">
          <div className="max-w-[60%]">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink"><ShieldCheck className="h-4 w-4 text-brand-600" /> Authenticity</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Scan the code or visit the link to confirm this certificate against the live record. Issued by Serategna; not a guarantee of future employment.</p>
            <p className="mt-1 break-all text-[11px] text-muted">{url}</p>
          </div>
          <img
            alt="Verify QR"
            className="h-28 w-28 rounded-xl border border-black/10 bg-white p-1.5"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(url)}`}
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        </div>
        <p className="mt-6 text-center text-[10px] text-muted">Serategna · ሰራተኛ — the work-to-credit operating system for Ethiopia's real economy.</p>
      </div>
    </div>
  );
}
