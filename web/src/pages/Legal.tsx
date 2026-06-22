import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui';
import { BackHeader } from './_shared';

export function Legal() {
  const [params, setParams] = useSearchParams();
  const doc = params.get('doc') === 'privacy' ? 'privacy' : 'terms';
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData(null);
    api.get<any>(`/api/legal/${doc}`).then(setData).catch(() => setData({ error: true }));
  }, [doc]);

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <BackHeader title="Policies" />
      <div className="flex gap-2 px-5 pt-3">
        {(['terms', 'privacy'] as const).map((d) => (
          <button key={d} onClick={() => setParams({ doc: d })} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${doc === d ? 'bg-ink text-white' : 'glass text-muted'}`}>
            {d === 'terms' ? 'Terms' : 'Privacy'}
          </button>
        ))}
      </div>

      {!data ? <Spinner /> : (
        <div className="px-5 pt-4">
          <h1 className="text-xl font-extrabold text-ink">{data.title}</h1>
          <p className="text-xs text-muted">Version {data.version} · Updated {data.updated}</p>

          <div className="mt-3 info">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>No stored value, no wallet — Serategna does not require an NBE Payment Instrument Issuer licence.</span>
          </div>

          <div className="mt-4 space-y-4">
            {data.sections?.map((s: any, i: number) => (
              <div key={i}>
                <h2 className="text-sm font-bold text-ink">{s.h}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
