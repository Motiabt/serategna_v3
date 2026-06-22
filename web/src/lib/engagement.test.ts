import { describe, it, expect } from 'vitest';
import { nextStreak, dayKey, weekStart, daysLeftInWeek, thisWeekEarnings } from './engagement';

describe('nextStreak', () => {
  it('starts at 1 with no history', () => {
    expect(nextStreak(null, '2026-06-21')).toEqual({ count: 1, last: '2026-06-21' });
  });
  it('is unchanged on the same day', () => {
    const prev = { count: 3, last: '2026-06-21' };
    expect(nextStreak(prev, '2026-06-21')).toBe(prev);
  });
  it('increments when the last visit was yesterday', () => {
    expect(nextStreak({ count: 3, last: '2026-06-20' }, '2026-06-21')).toEqual({ count: 4, last: '2026-06-21' });
  });
  it('resets to 1 after a gap', () => {
    expect(nextStreak({ count: 9, last: '2026-06-18' }, '2026-06-21')).toEqual({ count: 1, last: '2026-06-21' });
  });
});

describe('week helpers', () => {
  it('weekStart is the Monday of the week', () => {
    // 2026-06-21 is a Sunday → week started Monday 2026-06-15
    expect(dayKey(weekStart(new Date('2026-06-21T12:00:00')))).toBe('2026-06-15');
    // 2026-06-15 is a Monday → same day
    expect(dayKey(weekStart(new Date('2026-06-15T08:00:00')))).toBe('2026-06-15');
  });
  it('daysLeftInWeek counts inclusive of today', () => {
    expect(daysLeftInWeek(new Date('2026-06-15T12:00:00'))).toBe(7); // Monday
    expect(daysLeftInWeek(new Date('2026-06-21T12:00:00'))).toBe(1); // Sunday
  });
  it('thisWeekEarnings sums only postings in the current week', () => {
    const now = new Date('2026-06-21T12:00:00');
    const earnings = [
      { amount: 1000, postedAt: '2026-06-16T10:00:00' }, // in week
      { amount: 500, postedAt: '2026-06-21T09:00:00' }, // in week
      { amount: 9999, postedAt: '2026-06-10T09:00:00' }, // before week
    ];
    expect(thisWeekEarnings(earnings, now)).toBe(1500);
  });
});
