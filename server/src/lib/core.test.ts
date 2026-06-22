import { describe, it, expect } from 'vitest';
import { wageFloor, wageFloors, MIN_TASK_PRICE, LIVING_WAGE, feeBreakdown } from './wage.js';
import { matchScore, matchReasons } from './matching.js';
import { EMPLOYER_POST_LIMIT, WORKER_APP_LIMIT, MATCH_THRESHOLD, PLANS } from './subscription.js';
import { pageParams, MAX_PAGE, DEFAULT_PAGE } from './paginate.js';
import { scorePsychometric, PSY_QUESTIONS } from './psychometric.js';
import { normalizeEthioMsisdn, isEthiopianMobile } from './sms.js';
import { generateTotpSecret, currentTotp, verifyTotp } from './totp.js';

describe('wage floors', () => {
  it('enforces the living-wage monthly floor', () => {
    expect(wageFloor('monthly')).toBe(LIVING_WAGE.monthly);
    expect(wageFloor('monthly', true)).toBe(LIVING_WAGE.liveInMonthly); // live-in cash floor
  });
  it('prorates by rate type', () => {
    expect(wageFloor('daily')).toBe(Math.round(LIVING_WAGE.monthly / 26));
    expect(wageFloor('hourly')).toBe(Math.round(LIVING_WAGE.monthly / (26 * 9)));
  });
  it('falls back to the minimum task price for gigs', () => {
    expect(wageFloor('fixed')).toBe(MIN_TASK_PRICE);
    expect(wageFloors().fixed).toBe(MIN_TASK_PRICE);
  });
  it('takes no commission — worker keeps 100%, nothing held', () => {
    const f = feeBreakdown(1000);
    expect(f.workerNet).toBe(1000);
    expect(f.brokerCommission).toBe(0);
    expect(f.held).toBe(false);
  });
});

describe('match scoring (skill-first, both directions)', () => {
  const strong = { distanceKm: 2, categoryMatch: true, roleMatch: true, rating: 4.9, score: 720, verified: true, recencyDays: 1 };
  it('an exact specialization match clears the 80% gate', () => {
    expect(matchScore(strong)).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
  });
  it('an irrelevant skill is gated out (<80)', () => {
    expect(matchScore({ ...strong, categoryMatch: false, roleMatch: false })).toBeLessThan(MATCH_THRESHOLD);
  });
  it('a busy/engaged worker is discounted below the gate', () => {
    expect(matchScore({ ...strong, available: false })).toBeLessThan(MATCH_THRESHOLD);
  });
  it('explains itself transparently', () => {
    expect(matchReasons(strong)).toContain('Exact specialization');
    expect(matchReasons(strong)).toContain('Fayda-verified');
  });
  it('always returns a 0–100 integer', () => {
    const v = matchScore(strong);
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });
});

describe('subscription / quota constants', () => {
  it('matches the documented business model', () => {
    expect(EMPLOYER_POST_LIMIT).toBe(5);
    expect(WORKER_APP_LIMIT).toBe(5);
    expect(MATCH_THRESHOLD).toBe(80);
    expect(PLANS.monthly.price).toBe(100);
    expect(PLANS.annual.price).toBe(1000);
  });
});

describe('pagination clamping (anti resource-exhaustion)', () => {
  it('clamps an excessive limit to the max', () => {
    expect(pageParams({ limit: '99999' }).take).toBe(MAX_PAGE);
  });
  it('defaults when missing or invalid', () => {
    expect(pageParams({}).take).toBe(DEFAULT_PAGE);
    expect(pageParams({ limit: 'abc' }).take).toBe(DEFAULT_PAGE);
  });
  it('parses offset and never goes negative', () => {
    expect(pageParams({ offset: '10' }).skip).toBe(10);
    expect(pageParams({ offset: '-5' }).skip).toBe(0);
  });
});

describe('Ethio Telecom MSISDN normalisation', () => {
  it('normalises every Ethiopian format to 2519XXXXXXXX', () => {
    expect(normalizeEthioMsisdn('+251911234567')).toBe('251911234567');
    expect(normalizeEthioMsisdn('0911234567')).toBe('251911234567');
    expect(normalizeEthioMsisdn('911234567')).toBe('251911234567');
    expect(normalizeEthioMsisdn('251911234567')).toBe('251911234567');
    expect(normalizeEthioMsisdn('+251 91 123 45 67')).toBe('251911234567');
  });
});

describe('Ethiopian mobile validation (Ethio Telecom 09 / Safaricom 07 only)', () => {
  it('accepts Ethio Telecom (9…) and Safaricom (7…) numbers', () => {
    expect(isEthiopianMobile('+251911234567')).toBe(true);
    expect(isEthiopianMobile('0911234567')).toBe(true);
    expect(isEthiopianMobile('0712345678')).toBe(true);
    expect(isEthiopianMobile('+251712345678')).toBe(true);
  });
  it('rejects non-Ethiopian and non-mobile numbers', () => {
    expect(isEthiopianMobile('+12025550111')).toBe(false); // US
    expect(isEthiopianMobile('+251112345678')).toBe(false); // landline (1…)
    expect(isEthiopianMobile('123')).toBe(false);
  });
});

describe('TOTP 2FA (authenticator app)', () => {
  it('verifies the current code and rejects a wrong one', () => {
    const secret = generateTotpSecret();
    expect(secret.length).toBeGreaterThanOrEqual(16);
    expect(verifyTotp(secret, currentTotp(secret))).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
    expect(verifyTotp(secret, 'abc')).toBe(false);
  });
});

describe('psychometric reliability index', () => {
  it('returns 100 when every answer is maximally reliable (handling reverse items)', () => {
    const answers = PSY_QUESTIONS.map((q) => ({ q: q.id, value: q.reverse ? 1 : 5 }));
    expect(scorePsychometric(answers).reliabilityIndex).toBe(100);
  });
  it('returns ~50 for neutral answers', () => {
    const answers = PSY_QUESTIONS.map((q) => ({ q: q.id, value: 3 }));
    expect(scorePsychometric(answers).reliabilityIndex).toBe(50);
  });
});
