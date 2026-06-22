import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { relTime } from '../lib/format';
import { Spinner, EmptyState, Pill } from '../components/ui';
import { BackHeader } from './_shared';

export function Contracts() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    api.get<any[]>('/api/contracts/mine').then(setItems).catch(() => setItems([]));
  }, []);

  if (items === null) return <Spinner />;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <BackHeader title="Contracts" />
      <p className="px-5 pt-1 text-sm text-muted">Digitally signed under Proclamation 1205/2020</p>

      <div className="space-y-3 px-5 pt-4">
        {items.length === 0 && (
          <EmptyState icon={<FileText className="h-6 w-6" />} title="No contracts yet" sub="Contracts appear when a contract/permanent job is assigned." />
        )}
        {items.map((c) => (
          <button key={c.id} onClick={() => nav(`/app/contract/${c.id}`)} className="card flex w-full items-center gap-3 p-4 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
              <p className="text-xs text-muted">{relTime(c.createdAt)} · {c.signatures?.length ?? 0} signed</p>
            </div>
            {c.status === 'signed' ? (
              <Pill tone="brand"><CheckCircle2 className="h-3 w-3" /> Signed</Pill>
            ) : (
              <Pill tone="amber"><Clock className="h-3 w-3" /> {c.status}</Pill>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
