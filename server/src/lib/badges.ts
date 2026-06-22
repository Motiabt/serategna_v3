// Reputation badges derived from real, verified platform data. These are the
// trust signals that make a Serategna worker instantly credible to a household,
// SME, or lender — the social proof layer on top of the Score.

export interface Badge {
  key: string;
  label: string;
  tone: 'brand' | 'mint' | 'amber' | 'navy';
}

export interface BadgeInput {
  tier: number;
  avgRating: number;
  jobsCompleted: number;
  completionRate: number;
  score: number;
  certified?: boolean;
  reliability?: number; // 0–100 psychometric index
}

export function workerBadges(b: BadgeInput): Badge[] {
  const out: Badge[] = [];
  if (b.tier >= 1) out.push({ key: 'verified', label: 'Fayda-verified', tone: 'brand' });
  if (b.certified) out.push({ key: 'certified', label: 'Certified', tone: 'brand' });
  if ((b.reliability ?? 0) >= 80) out.push({ key: 'trustworthy', label: 'High integrity', tone: 'mint' });
  if (b.avgRating >= 4.8 && b.jobsCompleted >= 5) out.push({ key: 'top_rated', label: 'Top rated', tone: 'mint' });
  if (b.completionRate >= 0.95 && b.jobsCompleted >= 5) out.push({ key: 'reliable', label: 'Reliable', tone: 'navy' });
  if (b.jobsCompleted >= 20) out.push({ key: 'experienced', label: 'Experienced', tone: 'navy' });
  if (b.jobsCompleted < 5 && b.avgRating >= 4.5) out.push({ key: 'rising', label: 'Rising star', tone: 'amber' });
  if (b.score >= 740) out.push({ key: 'elite', label: 'Elite score', tone: 'mint' });
  return out;
}
