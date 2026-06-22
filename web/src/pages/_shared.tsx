import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { tokens } from '../lib/api';

/**
 * Worker/Client role switch — one account can be both (spec B3.1). Switching to
 * "Work" the first time enables the worker role + profile on the same account.
 * `variant="full"` renders a labelled two-button block (Profile page); default
 * is a compact pill (Home header).
 */
export function ModeSwitch({ variant = 'pill' }: { variant?: 'pill' | 'full' }) {
  const { user, mode, setMode, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user || user.roles.admin) return null;

  async function pick(m: 'client' | 'worker') {
    if (m === 'worker' && !user!.roles.worker) {
      setBusy(true);
      try {
        const res = await api.post<{ accessToken: string; refreshToken: string }>('/api/auth/enable-worker');
        tokens.set(res.accessToken, res.refreshToken);
        await refreshUser();
      } finally {
        setBusy(false);
      }
    }
    setMode(m);
  }

  if (variant === 'full') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(['worker', 'client'] as const).map((m) => (
          <button
            key={m}
            disabled={busy}
            onClick={() => pick(m)}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              mode === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/[0.06] bg-white text-muted'
            }`}
          >
            {m === 'worker' ? 'Find work' : 'Hire & post jobs'}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="glass-pill inline-flex p-1">
      {(['client', 'worker'] as const).map((m) => (
        <button
          key={m}
          disabled={busy}
          onClick={() => pick(m)}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
            mode === m ? 'bg-brand-600 text-white shadow-soft' : 'text-muted'
          }`}
        >
          {m === 'worker' ? 'Work' : 'Hire'}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-5 pb-2 pt-7">
      <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function BackHeader({ title }: { title: string }) {
  const nav = useNavigate();
  return (
    <div className="flex items-center gap-3 px-5 pt-6">
      <button onClick={() => nav(-1)} className="btn flex h-9 w-9 items-center justify-center rounded-full bg-white p-0 shadow-soft">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-bold text-ink">{title}</h1>
    </div>
  );
}
