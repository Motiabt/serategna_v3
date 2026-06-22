import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, Check, Briefcase, FileText, Wallet, ShieldAlert, Gavel } from 'lucide-react';
import { api } from '../lib/api';
import { relTime } from '../lib/format';
import { Spinner, EmptyState } from '../components/ui';
import { BackHeader } from './_shared';

const ICONS: Record<string, any> = {
  job: Briefcase, bid: Gavel, contract: FileText, payout: Wallet, sos: ShieldAlert, reminder: Clock, system: Bell,
};

export function Notifications() {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);

  const load = () => api.get<any>('/api/notifications').then(setData).catch(() => setData({ notifications: [], reminders: [] }));
  useEffect(() => { load(); }, []);

  async function markAll() {
    await api.post('/api/notifications/read', {});
    load();
  }
  async function open(n: any) {
    await api.post('/api/notifications/read', { id: n.id });
    if (n.link) nav(n.link);
    else load();
  }

  if (!data) return <Spinner />;

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <BackHeader title="Notifications" />
      <div className="flex justify-end px-5 pt-1">
        <button onClick={markAll} className="text-xs font-semibold text-brand-700">Mark all read</button>
      </div>

      {data.reminders?.length > 0 && (
        <div className="px-5 pt-3">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Reminders</h2>
          <div className="space-y-2">
            {data.reminders.map((n: any) => (
              <div key={n.id} className="info">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold text-accent-700">{n.title}</p>
                  <p className="text-xs">{n.body} · due {relTime(n.dueAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 px-5 pt-4">
        {(data.notifications ?? []).length === 0 ? (
          <EmptyState icon={<Bell className="h-6 w-6" />} title="No notifications yet" sub="Job updates, bids, contracts and reminders will appear here." />
        ) : (
          data.notifications.map((n: any) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <button key={n.id} onClick={() => open(n)} className={`card flex w-full items-start gap-3 p-4 text-left ${n.read ? 'opacity-70' : ''}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  <p className="text-xs text-muted">{n.body}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{relTime(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
