import { ShieldCheck, Star, ThumbsUp, Award, Sparkles, Crown } from 'lucide-react';

interface Badge { key: string; label: string; tone: string }

const ICON: Record<string, any> = {
  verified: ShieldCheck,
  top_rated: Star,
  reliable: ThumbsUp,
  experienced: Award,
  rising: Sparkles,
  elite: Crown,
};
const TONE: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-700',
  mint: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-accent/15 text-amber-accent',
  navy: 'bg-slate/10 text-slate',
};

export function BadgeRow({ badges, max = 4 }: { badges?: Badge[]; max?: number }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.slice(0, max).map((b) => {
        const Icon = ICON[b.key] ?? ShieldCheck;
        return (
          <span key={b.key} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[b.tone] ?? TONE.navy}`}>
            <Icon className="h-3 w-3" /> {b.label}
          </span>
        );
      })}
    </div>
  );
}
