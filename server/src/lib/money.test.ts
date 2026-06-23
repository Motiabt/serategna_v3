import { describe, it, expect } from 'vitest';
import { splitJob } from './ledger.js';
import { advanceFee, repaymentAmount, ADVANCE_FEE_RATE } from './advance.js';

// Money-path invariants. The ledger must never create or destroy birr, and the
// advance must never repay more than is owed. These are the highest-severity
// correctness properties for a credit product (audit findings #2/#3).

describe('splitJob — conservation (no birr created or destroyed)', () => {
  const verticals = ['home', 'delivery', 'pro', 'care'];
  const accountTypes = [undefined, 'business', 'sme'] as const;

  it('the three parts always reconcile exactly to the gross, across rates & rounding', () => {
    for (let total = 1; total <= 5000; total += 1) {
      for (const v of verticals) {
        for (const at of accountTypes) {
          const s = splitJob(total, v, at);
          expect(s.workerNet + s.commission + s.reserve).toBe(total); // exact, integer
          expect(s.workerNet).toBeGreaterThanOrEqual(0);
          expect(s.commission).toBeGreaterThanOrEqual(0);
          expect(s.reserve).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('worker keeps the large majority (take rate stays well under 20%)', () => {
    const s = splitJob(1000, 'home');
    expect(s.workerNet).toBeGreaterThan(800);
  });

  it('business/SME accounts use a distinct take rate', () => {
    const home = splitJob(10_000, 'home');
    const biz = splitJob(10_000, 'home', 'business');
    expect(biz.rate).not.toBe(home.rate);
    expect(biz.workerNet + biz.commission + biz.reserve).toBe(10_000);
  });
});

describe('earned-wage advance — fee & repayment math', () => {
  it('charges a flat fee at exactly the configured rate', () => {
    expect(advanceFee(1000)).toBe(Math.round(1000 * ADVANCE_FEE_RATE));
    expect(advanceFee(1300)).toBe(52); // 4% of 1300
    expect(advanceFee(0)).toBe(0);
  });

  it('repays at most half of each payment and never more than owed', () => {
    expect(repaymentAmount(1040, 800)).toBe(400); // 50% of 800
    expect(repaymentAmount(240, 5000)).toBe(240); // capped by outstanding, not 2500
    expect(repaymentAmount(1040, 0)).toBe(0); // no earning → no repayment
    expect(repaymentAmount(0, 5000)).toBe(0); // nothing owed
  });

  it('fully amortizes an advance without ever going negative', () => {
    let outstanding = advanceFee(1000) + 1000; // total = 1040
    const earnings = [800, 800, 800, 800];
    for (const e of earnings) {
      const applied = repaymentAmount(outstanding, e);
      outstanding -= applied;
      expect(outstanding).toBeGreaterThanOrEqual(0);
    }
    expect(outstanding).toBe(0);
  });
});
