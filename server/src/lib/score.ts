import { prisma } from './prisma.js';
import { ACCOUNTS, balance } from './ledger.js';

// Serategna Score v2.0 component weights (spec C3.1). Computed from Phase 1
// ledger + behavioural data so the score is live and visible from job one.
export const WEIGHTS = {
  transactionIntegrity: 0.35,
  earningsConsistency: 0.3,
  platformBehavior: 0.2,
  relationshipCapital: 0.15,
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function consistency(amounts: number[]): number {
  if (amounts.length < 2) return amounts.length === 1 ? 0.55 : 0.4;
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (mean === 0) return 0;
  const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
  const cv = Math.sqrt(variance) / mean;
  // reward volume too: more jobs -> more confidence
  const volume = clamp(amounts.length / 12);
  return clamp((1 - cv) * 0.7 + volume * 0.3);
}

export function bandOf(score: number): string {
  if (score >= 740) return 'excellent';
  if (score >= 670) return 'good';
  if (score >= 580) return 'fair';
  if (score >= 500) return 'building';
  return 'new';
}

export interface ScoreResult {
  score: number;
  band: string;
  components: {
    transactionIntegrity: number;
    earningsConsistency: number;
    platformBehavior: number;
    relationshipCapital: number;
  };
  payable: number;
  totalEarned: number;
  jobsCompleted: number;
}

export async function computeScore(workerId: string): Promise<ScoreResult> {
  const [confirmedJobs, disputes, profile, ratings, payable] = await Promise.all([
    prisma.job.findMany({
      where: { workerId, status: 'confirmed' },
      select: { agreedPrice: true, confirmedAt: true },
      orderBy: { confirmedAt: 'asc' },
    }),
    prisma.dispute.count({ where: { job: { workerId } } }),
    prisma.workerProfile.findUnique({ where: { userId: workerId } }),
    prisma.rating.findMany({ where: { rateeId: workerId }, select: { stars: true } }),
    balance(ACCOUNTS.WORKER_PAYABLE, { ownerId: workerId }),
  ]);

  const amounts = confirmedJobs.map((j) => j.agreedPrice ?? 0);
  const totalEarned = amounts.reduce((a, b) => a + b, 0);
  const jobsCompleted = confirmedJobs.length;

  const transactionIntegrity =
    jobsCompleted > 0 ? clamp(1 - disputes / jobsCompleted) : 0.5;

  const earningsConsistency = consistency(amounts);

  // psychometric reliability (0–100) feeds platform behavior (spec/ALGORITHM)
  const psy = await prisma.psychometricResult.findUnique({ where: { userId: workerId } });
  const reliability = psy ? psy.reliabilityIndex / 100 : 0.5;

  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, r) => a + r.stars, 0) / ratings.length : 0;
  const completion = clamp(profile?.completionRate ?? 0);
  const platformBehavior = clamp(
    completion * 0.4 + (avgRating > 0 ? (avgRating - 1) / 4 : 0) * 0.4 + reliability * 0.2,
  );

  const vouched = profile?.vouchedById ? 0.4 : 0;
  const tierUser = await prisma.user.findUnique({ where: { id: workerId }, select: { tier: true } });
  const tierBoost = (tierUser?.tier ?? 0) >= 1 ? 0.4 : 0.15;
  const verifiedCerts = await prisma.certification.count({ where: { userId: workerId, status: 'verified' } });
  const certBoost = verifiedCerts > 0 ? 0.2 : 0;
  const relationshipCapital = clamp(vouched + tierBoost + certBoost);

  const components = {
    transactionIntegrity,
    earningsConsistency,
    platformBehavior,
    relationshipCapital,
  };

  const weighted =
    transactionIntegrity * WEIGHTS.transactionIntegrity +
    earningsConsistency * WEIGHTS.earningsConsistency +
    platformBehavior * WEIGHTS.platformBehavior +
    relationshipCapital * WEIGHTS.relationshipCapital;

  const score = Math.round(300 + weighted * 550);
  return { score, band: bandOf(score), components, payable, totalEarned, jobsCompleted };
}

/** Compute + persist a snapshot, returning the result. */
export async function snapshotScore(workerId: string): Promise<ScoreResult> {
  const result = await computeScore(workerId);
  await prisma.scoreSnapshot.create({
    data: {
      workerId,
      score: result.score,
      band: result.band,
      components: JSON.stringify(result.components),
      modelVersion: 'v2',
    },
  });
  return result;
}
