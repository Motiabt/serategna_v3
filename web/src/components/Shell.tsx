import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Briefcase, Gauge, Wallet, User, Search, Plus, ClipboardList } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

/** Centered phone frame so the mobile-first UI looks intentional on desktop. */
export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#dfe6df] p-0 dark:bg-[#04080f] sm:p-6">
      <div className="relative flex h-screen w-full flex-col overflow-hidden mesh sm:h-[860px] sm:max-h-[92vh] sm:w-[420px] sm:rounded-[2.9rem] sm:border-[11px] sm:border-ink/90 sm:shadow-float">
        {children}
      </div>
    </div>
  );
}

const WORKER_NAV = [
  { to: '/app/home', icon: Home, tkey: 'home' as const },
  { to: '/app/jobs', icon: Briefcase, tkey: 'jobs' as const },
  { to: '/app/score', icon: Gauge, tkey: 'score' as const },
  { to: '/app/wallet', icon: Wallet, tkey: 'wallet' as const },
  { to: '/app/profile', icon: User, tkey: 'profile' as const },
];

const CLIENT_NAV = [
  { to: '/app/home', icon: Home, tkey: 'home' as const },
  { to: '/app/browse', icon: Search, tkey: 'browse' as const },
  { to: '/app/post', icon: Plus, tkey: 'post', center: true },
  { to: '/app/orders', icon: ClipboardList, tkey: 'myJobs' as const },
  { to: '/app/profile', icon: User, tkey: 'profile' as const },
];

export function BottomNav() {
  const { mode } = useAuth();
  const { t } = useI18n();
  const items = mode === 'worker' ? WORKER_NAV : CLIENT_NAV;
  const loc = useLocation();
  return (
    <nav className="shrink-0 px-4 pb-5 pt-2">
      <div className="flex items-center justify-between rounded-full border border-black/[0.05] bg-white/95 px-2.5 py-2 shadow-[0_12px_36px_-14px_rgba(8,55,34,0.35)] backdrop-blur dark:border-white/10 dark:bg-[#101d33]/95">
        {items.map((it) => {
          const active = loc.pathname === it.to;
          const label = t(it.tkey as any);
          if ('center' in it && it.center) {
            return (
              <NavLink key={it.to} to={it.to} aria-label={label} className="px-1">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-soft transition active:scale-90">
                  <it.icon className="h-6 w-6" />
                </span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={it.to}
              to={it.to}
              aria-label={label}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 transition active:scale-95 ${
                active ? 'bg-brand-600 text-white shadow-soft' : 'text-muted'
              }`}
            >
              <it.icon className="h-5 w-5" />
              {active && <span className="text-xs font-semibold">{label}</span>}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function Scroll({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2 no-scrollbar">{children}</div>;
}
