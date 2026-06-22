import { Navigate, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n, LANGS } from '../lib/i18n';
import { Spinner, BrandMark } from '../components/ui';
import { EnterpriseConsole } from './EnterpriseConsole';

// Enterprises run entirely on the WEB — no app install. This wraps the console
// in a full-browser layout (not the phone shell) with its own web chrome.
export function EnterpriseWeb() {
  const { user, loading, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();

  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-mist text-ink">
      <header className="sticky top-0 z-20 border-b border-black/[0.05] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <button onClick={() => nav('/')} className="flex items-center gap-2.5">
            <BrandMark size={30} />
            <span className="font-extrabold">Serategna <span className="font-semibold text-muted">Enterprise</span></span>
          </button>
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
              aria-label={t('language')}
              className="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-sm font-semibold"
            >
              {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
            <button onClick={() => { logout(); nav('/'); }} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              <LogOut className="h-4 w-4" /> {t('logout')}
            </button>
          </div>
        </div>
      </header>

      {/* The console renders its own cards; give it a comfortable web column. */}
      <main className="mx-auto max-w-4xl px-2 pb-12 sm:px-5">
        <EnterpriseConsole />
      </main>
    </div>
  );
}
