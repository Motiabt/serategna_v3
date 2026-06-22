import { useEffect, useState } from 'react';
import { Sparkles, Printer, ShieldCheck, Star, Upload } from 'lucide-react';
import { api } from '../lib/api';
import { Spinner, Sheet } from '../components/ui';
import { BackHeader } from './_shared';

export function Cv() {
  const [cv, setCv] = useState<any>(null);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<string[] | null>(null);

  useEffect(() => {
    api.get<any>('/api/ai/cv').then(setCv).catch((e) => setError(e.message));
  }, []);

  async function importCv() {
    setBusy(true);
    try {
      const res = await api.post<any>('/api/ai/cv-import', { text });
      setCv(res.cv);
      setImported(res.parsed?.matchedTitles ?? []);
      setSheet(false);
      setText('');
    } finally {
      setBusy(false);
    }
  }

  if (error) return (<><BackHeader title="Smart CV" /><p className="p-6 text-muted">{error} — switch to Work mode to build your CV.</p></>);
  if (!cv) return <Spinner label="Generating your CV…" />;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <BackHeader title="Smart CV Builder" />
      <div className="flex items-center justify-between gap-2 px-5 pt-2">
        <span className="flex items-center gap-2 text-xs text-muted"><Sparkles className="h-3.5 w-3.5 text-brand-600" /> From your verified record</span>
        <button onClick={() => setSheet(true)} className="flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700"><Upload className="h-3.5 w-3.5" /> Import CV</button>
      </div>
      {imported && imported.length > 0 && (
        <div className="mx-5 mt-2 info"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" /><span>Matched & added: {imported.slice(0, 6).join(', ')}{imported.length > 6 ? '…' : ''}</span></div>
      )}

      <div className="px-5 pt-3">
        <div className="card overflow-hidden">
          {/* CV header */}
          <div className="hero p-5">
            <p className="text-2xl font-extrabold">{cv.name}</p>
            <p className="text-sm text-white/85">{cv.headline}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
              <ShieldCheck className="h-3.5 w-3.5" /> {cv.verification} · {cv.contact.subCity}
            </p>
          </div>

          <div className="p-5">
            <p className="text-sm leading-relaxed text-ink">{cv.summary}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {cv.stats.map((s: any) => (
                <div key={s.label} className="rounded-2xl bg-mist px-3 py-2">
                  <p className="text-[11px] text-muted">{s.label}</p>
                  <p className="font-bold text-ink">{s.value}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-5 text-sm font-bold text-ink">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {cv.skills.map((s: string) => (
                <span key={s} className="pill bg-brand-50 text-brand-700">{s}</span>
              ))}
            </div>

            <h3 className="mt-5 text-sm font-bold text-ink">Experience</h3>
            <div className="mt-2 space-y-3">
              {cv.experience.map((e: any, i: number) => (
                <div key={i} className="border-l-2 border-brand-200 pl-3">
                  <p className="text-sm font-semibold text-ink">{e.title} <span className="text-xs font-normal text-muted">{e.period}</span></p>
                  <p className="text-xs text-muted">{e.detail}</p>
                </div>
              ))}
              {cv.experience.length === 0 && <p className="text-xs text-muted">Complete jobs to build your experience.</p>}
            </div>

            <h3 className="mt-5 text-sm font-bold text-ink">Highlights</h3>
            <ul className="mt-2 space-y-1.5">
              {cv.highlights.map((h: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink">
                  <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-accent text-amber-accent" /> {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4">
        <button onClick={() => window.print()} className="btn-brand w-full">
          <Printer className="h-4 w-4" /> Export / Print CV
        </button>
        <p className="mt-2 text-center text-xs text-muted">Your verified income history — a first formal income proof.</p>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Import your CV">
        <p className="mb-2 text-sm text-muted">Paste your CV text (or job experience). We match it to the Serategna taxonomy and fill your skills & specializations automatically.</p>
        <textarea className="input min-h-[140px] resize-none" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste CV text here…" />
        <button onClick={importCv} disabled={busy || text.length < 10} className="btn-brand mt-4 w-full"><Upload className="h-4 w-4" /> Convert & apply to profile</button>
      </Sheet>
    </div>
  );
}
