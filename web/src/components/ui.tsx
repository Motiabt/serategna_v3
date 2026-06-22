import { ReactNode } from 'react';
import { Loader2, Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';

/** Reusable light/dark toggle (works on light surfaces, e.g. marketing pages). */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle light or dark mode"
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.06] bg-white text-ink ${className}`}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** App icon-style brand mark (rounded gradient square, finance/Apple inspired). */
export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-[28%] shadow-soft"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(150deg, #22d3ee 0%, #06b6d4 45%, #0a192f 100%)',
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.4}>
        <circle cx="12" cy="4" r="1.6" />
        <circle cx="5" cy="12" r="1.6" />
        <circle cx="19" cy="12" r="1.6" />
        <circle cx="12" cy="20" r="1.6" />
        <path d="M12 5.5 L5 11 M12 5.5 L19 11 M5 13 L12 18.5 M19 13 L12 18.5" />
      </svg>
    </div>
  );
}

/** Soft static gradient blob — decorative accent (no animation). */
export function GradientOrb({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 30% 25%, #67e8f9 0%, transparent 45%), radial-gradient(circle at 75% 70%, #3b82f6 0%, transparent 50%), linear-gradient(150deg, #22d3ee, #0a192f)',
      }}
      aria-hidden
    />
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: 'linear-gradient(150deg, #22d3ee 0%, #0a192f 100%)',
      }}
    >
      {src ? <img src={src} alt={name} className="h-full w-full rounded-full object-cover" /> : initials}
    </div>
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'amber' | 'rose' | 'sky' | 'lime';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-mist text-muted',
    brand: 'bg-brand-50 text-brand-700',
    lime: 'bg-brand-100 text-brand-700',
    amber: 'bg-amber-accent/15 text-amber-accent',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-accent-50 text-accent-700',
  };
  return <span className={`pill ${tones[tone]}`}>{children}</span>;
}

/** Skeleton loaders for perceived performance. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-black/[0.06] ${className}`} />;
}

export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-center gap-3 p-4">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted">
      <Loader2 className="h-6 w-6 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft">
        {icon}
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function StatBlock({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex-1">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${accent ? 'text-brand-600' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

export function ScoreRing({ score, size = 150, band }: { score: number; size?: number; band: string }) {
  const min = 300;
  const max = 850;
  const pct = Math.max(0, Math.min(1, (score - min) / (max - min)));
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#scoreGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-ink">{score}</span>
        <span className="text-xs font-medium capitalize text-muted">{band}</span>
      </div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[3px]" />
      <div
        className="relative max-h-[88%] w-full animate-fade-up overflow-y-auto rounded-t-5xl border-t border-white/70 bg-cream/95 p-5 no-scrollbar backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
        {title && <h3 className="mb-3 text-lg font-bold text-ink">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}
