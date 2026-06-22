import { splitJob } from './ledger.js';

/**
 * Living-wage floor for Addis Ababa (see docs/LIVING_WAGE.md for methodology).
 *
 * Ethiopia has no statutory private-sector minimum wage; informal domestic
 * workers are frequently paid below survival level, and delala (brokers) skim
 * large commissions on top. Serategna sets a transparent living-wage FLOOR so a
 * worker is never hired below what one adult needs to survive in Addis.
 *
 * Researched single-adult survival budget, Addis Ababa (monthly, ETB):
 *   shared housing 2,500 · food 3,000 · transport 1,000 · utilities/phone 1,000
 *   · health/misc 1,000  ≈ 8,500  → floor set at 8,000 (live-out).
 * Live-in domestic workers receive food + lodging in kind, so a separate CASH
 * floor of 5,000/month applies to them.
 *
 * Proration uses 26 working days / month and a 9-hour domestic working day.
 */
export const LIVING_WAGE = {
  monthly: Number(process.env.LIVING_WAGE_MONTHLY ?? 8000),
  liveInMonthly: Number(process.env.LIVE_IN_CASH_FLOOR ?? 5000),
  workingDays: 26,
  hoursPerDay: 9,
};

// Floor on EVERY job — even one-off gigs — so no one can be underpaid (removes
// the delala-era abuse of rock-bottom rates).
export const MIN_TASK_PRICE = Number(process.env.MIN_TASK_PRICE ?? 150);

export function wageFloor(rateType: string, liveIn = false): number {
  const monthly = liveIn ? LIVING_WAGE.liveInMonthly : LIVING_WAGE.monthly;
  switch (rateType) {
    case 'monthly':
      return monthly;
    case 'weekly':
      return Math.round(monthly / 4.345);
    case 'daily':
      return Math.round(monthly / LIVING_WAGE.workingDays);
    case 'hourly':
      return Math.round(monthly / (LIVING_WAGE.workingDays * LIVING_WAGE.hoursPerDay));
    default:
      return MIN_TASK_PRICE; // per-task gigs still have a minimum
  }
}

/** Floors for display, all rate types at once. */
export function wageFloors(liveIn = false) {
  return {
    monthly: wageFloor('monthly', liveIn),
    weekly: wageFloor('weekly', liveIn),
    daily: wageFloor('daily', liveIn),
    hourly: wageFloor('hourly', liveIn),
    fixed: MIN_TASK_PRICE,
    task: MIN_TASK_PRICE,
  };
}

/**
 * Transparent fee breakdown (anti-delala). Serategna takes **no commission** on
 * wages and **never holds the money** — the employer pays the worker directly,
 * so the worker keeps 100%. The platform is funded by a flat employer
 * subscription, not by skimming the worker's pay (the delala scandal).
 */
export function feeBreakdown(amount: number, _vertical?: string, _accountType?: string) {
  void splitJob; // legacy escrow split retained for optional escrow mode
  return {
    amount,
    workerNet: amount,
    platformFee: 0,
    guaranteeReserve: 0,
    takeRatePct: 0,
    workerKeepsPct: 100,
    brokerCommission: 0,
    held: false,
    note: 'Worker keeps 100%. No commission, no broker cut, no held funds — Serategna is funded by a flat employer subscription.',
  };
}
