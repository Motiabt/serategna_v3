// Earned-wage advance (EWA): the worker borrows against verified income and
// repays automatically from upcoming confirmed jobs. One flat, transparent fee —
// no compounding interest — consistent with Serategna's anti-exploitation stance.
//
// Money model: Serategna never holds funds. The advance is booked notionally
// (a partner MFI funds disbursement in production); repayment is recognised as
// the worker's next earnings are confirmed, and the outstanding balance is
// reduced so the worker always sees exactly what's left.

import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma.js';
import { creditReadiness } from './credit.js';

export const ADVANCE_FEE_RATE = 0.04; // flat 4% one-time fee
const REPAY_SHARE = 0.5; // at most 50% of each confirmed payment goes to repayment
const MIN_ADVANCE = 100;

export const advanceFee = (principal: number) => Math.round(principal * ADVANCE_FEE_RATE);

/** Pure: how much a confirmed earning repays — capped at REPAY_SHARE and never
 *  more than what's still owed. Exported so it's unit-tested directly. */
export const repaymentAmount = (outstanding: number, grossEarning: number) =>
  Math.max(0, Math.min(outstanding, Math.round(grossEarning * REPAY_SHARE)));

/** The worker's current active advance, or null. */
export function activeAdvance(userId: string) {
  return prisma.advance.findFirst({ where: { workerId: userId, status: 'active' }, orderBy: { createdAt: 'desc' } });
}

/** Quote: how much the worker can take right now and the fee on it. */
export async function advanceQuote(userId: string) {
  const [readiness, active] = await Promise.all([creditReadiness(userId), activeAdvance(userId)]);
  const maxAdvance = readiness.maxAdvance ?? 0;
  return {
    eligible: readiness.eligible && maxAdvance >= MIN_ADVANCE && !active,
    maxAdvance,
    minAdvance: MIN_ADVANCE,
    feeRate: ADVANCE_FEE_RATE,
    repayShare: REPAY_SHARE,
    verifiedIncome: readiness.verifiedIncome,
    score: readiness.score,
    reasons: readiness.reasons,
    active, // an existing advance blocks a new one
  };
}

/**
 * Take an advance. Validates eligibility + limit, then creates the row inside a
 * transaction that re-checks "no active advance" — so two concurrent requests
 * can't both disburse (the second sees the first and is rejected). On Postgres,
 * pair with Serializable isolation in production for a hard guarantee.
 */
export async function acceptAdvance(userId: string, amount: number, method = 'telebirr') {
  const q = await advanceQuote(userId);
  if (q.active) throw new Error('You already have an active advance — repay it first.');
  if (!q.eligible) throw new Error('Not eligible for an advance yet.');
  const principal = Math.round(amount);
  if (principal < MIN_ADVANCE) throw new Error(`Minimum advance is ETB ${MIN_ADVANCE}.`);
  if (principal > q.maxAdvance) throw new Error(`Maximum advance is ETB ${q.maxAdvance.toLocaleString()}.`);
  const fee = advanceFee(principal);
  const total = principal + fee;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.advance.findFirst({ where: { workerId: userId, status: 'active' } });
    if (existing) throw new Error('You already have an active advance — repay it first.');
    return tx.advance.create({
      data: { workerId: userId, principal, fee, total, outstanding: total, method, status: 'active' },
    });
  });
}

/**
 * Repay from a freshly confirmed earning. Called inside the job-confirm/finalize
 * transaction. Takes up to REPAY_SHARE of the payment, never more than what's
 * owed. Returns the amount applied and the new balance (for the notification).
 */
export async function applyAdvanceRepayment(
  tx: Prisma.TransactionClient | PrismaClient,
  workerId: string,
  grossEarning: number,
): Promise<{ applied: number; outstanding: number } | null> {
  if (!grossEarning || grossEarning <= 0) return null;
  const adv = await tx.advance.findFirst({ where: { workerId, status: 'active' }, orderBy: { createdAt: 'asc' } });
  if (!adv) return null;
  const applied = repaymentAmount(adv.outstanding, grossEarning);
  if (applied <= 0) return null;
  const outstanding = adv.outstanding - applied;
  await tx.advance.update({
    where: { id: adv.id },
    data: outstanding <= 0 ? { outstanding: 0, status: 'repaid', repaidAt: new Date() } : { outstanding },
  });
  return { applied, outstanding };
}
