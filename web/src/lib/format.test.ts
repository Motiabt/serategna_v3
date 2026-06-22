import { describe, it, expect } from 'vitest';
import { etb, closesIn, relTime } from './format';

describe('etb currency formatting', () => {
  it('formats with thousands separators and the ETB prefix', () => {
    expect(etb(1000)).toBe('ETB 1,000');
    expect(etb(0)).toBe('ETB 0');
    expect(etb(1234567)).toBe('ETB 1,234,567');
  });
  it('handles null/undefined gracefully', () => {
    expect(etb(null)).toBe('—');
    expect(etb(undefined)).toBe('—');
  });
});

describe('closesIn countdown', () => {
  it('returns null for missing/invalid dates', () => {
    expect(closesIn(null)).toBeNull();
    expect(closesIn(undefined)).toBeNull();
    expect(closesIn('not-a-date')).toBeNull();
  });
  it('returns Closed for a past deadline', () => {
    expect(closesIn(new Date(Date.now() - 60_000))).toBe('Closed');
  });
  it('counts down in days/hours/minutes', () => {
    expect(closesIn(new Date(Date.now() + 3 * 86400000))).toMatch(/Closes in 3d/);
    expect(closesIn(new Date(Date.now() + 5 * 3600000))).toMatch(/Closes in 5h/);
    expect(closesIn(new Date(Date.now() + 30 * 60000))).toMatch(/Closes in 30m/);
  });
});

describe('relTime', () => {
  it('says just now for the present', () => {
    expect(relTime(new Date())).toBe('just now');
  });
  it('formats minutes/hours ago', () => {
    expect(relTime(new Date(Date.now() - 5 * 60000))).toBe('5m ago');
    expect(relTime(new Date(Date.now() - 2 * 3600000))).toBe('2h ago');
  });
});
