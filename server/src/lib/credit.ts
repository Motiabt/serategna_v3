// Work-to-credit readiness. Serategna does NOT lend or hold money — it computes
// an eligibility + indicative limits from the worker's verified record and
// refers qualified workers to a partner MFI/bank. Limits are illustrative.

import { prisma } from './prisma.js';
import { computeScore } from './score.js';

const round100 = (n: number) => Math.max(0, Math.round(n / 100) * 100);

export async function creditReadiness(userId: string) {
  const [s, user, guarantors] = await Promise.all([
    computeScore(userId),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.guarantor.count({ where: { workerId: userId, status: 'active' } }),
  ]);

  const tenureMonths = user ? Math.max(1, Math.round((Date.now() - new Date(user.createdAt).getTime()) / (30 * 86400000))) : 1;
  const monthlyEst = Math.round((s.totalEarned ?? 0) / tenureMonths);
  const verified = (user?.tier ?? 0) >= 1;
  const hasGuarantor = guarantors > 0;
  const completed = s.jobsCompleted ?? 0;

  const eligible = verified && s.score >= 580 && completed >= 3 && monthlyEst > 0;
  const multiple = s.score >= 700 ? 3 : s.score >= 640 ? 2 : 1;
  const maxAdvance = eligible ? round100(monthlyEst * 0.5) : 0;
  const maxLoan = eligible ? round100(monthlyEst * multiple * (hasGuarantor ? 1 : 0.6)) : 0;

  const reasons: string[] = [];
  if (!verified) reasons.push('Verify your identity (Fayda) to unlock credit.');
  if (completed < 3) reasons.push(`Complete ${Math.max(0, 3 - completed)} more job(s) on Serategna.`);
  if (s.score < 580) reasons.push('Grow your Serategna Score to at least 580.');
  if (eligible && !hasGuarantor) reasons.push('Add a guarantor (ዋስ) to raise your loan limit.');

  const offers = eligible
    ? [
        { key: 'advance', name: 'Salary advance', amount: maxAdvance, term: 'repaid from your next jobs', rate: '0% intro · partner-set thereafter', partner: 'via partner MFI' },
        { key: 'micro_loan', name: 'Micro-loan', amount: maxLoan, term: 'up to 6 months', rate: 'partner-set · guarantor-backed', partner: 'via partner bank/MFI' },
      ].filter((o) => o.amount > 0)
    : [];

  return {
    eligible, score: s.score, band: s.band, verifiedIncome: s.totalEarned ?? 0,
    monthlyEst, completed, hasGuarantor, verified, tenureMonths,
    maxAdvance, maxLoan, reasons, offers,
    note: 'Serategna never lends or holds your money. Qualified workers are referred to a licensed partner lender.',
  };
}
