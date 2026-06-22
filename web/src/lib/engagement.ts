// Behavioural-economics helpers for the worker funnel: streaks (consistency
// bias / loss aversion), a weekly commitment device (goal-gradient), and the
// "this week" earnings used to score progress. All client-side (localStorage) —
// no schema or network cost — and pure where it matters, so it's unit-testable.

const STREAK_KEY = 'srt_streak';
const GOAL_KEY = 'srt_week_goal';

export interface StreakState { count: number; last: string }

/** Local YYYY-MM-DD (not UTC) so a "day" matches the user's calendar. */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Pure streak transition. Same day → unchanged; yesterday → +1; gap → reset to 1. */
export function nextStreak(prev: StreakState | null, today: string): StreakState {
  if (prev && prev.last === today) return prev;
  const y = new Date(today + 'T00:00:00');
  y.setDate(y.getDate() - 1);
  const yesterday = dayKey(y);
  if (prev && prev.last === yesterday) return { count: prev.count + 1, last: today };
  return { count: 1, last: today };
}

/** Record a visit and return the current streak (call once on the worker home). */
export function touchStreak(today = dayKey()): StreakState {
  let prev: StreakState | null = null;
  try { prev = JSON.parse(localStorage.getItem(STREAK_KEY) || 'null'); } catch { prev = null; }
  const next = nextStreak(prev, today);
  if (next !== prev) localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}

/** Monday 00:00 of the current week, local time (the commitment window). */
export function weekStart(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return d;
}

/** Days left in the current commitment week (incl. today), 1..7. */
export function daysLeftInWeek(now: Date = new Date()): number {
  return 7 - ((now.getDay() + 6) % 7);
}

/** Sum of earnings whose postedAt falls in the current week. */
export function thisWeekEarnings(earnings: Array<{ amount?: number; postedAt?: string }> | undefined, now: Date = new Date()): number {
  if (!earnings) return 0;
  const start = weekStart(now).getTime();
  return earnings.reduce((sum, e) => (e.postedAt && new Date(e.postedAt).getTime() >= start ? sum + (e.amount ?? 0) : sum), 0);
}

export function getWeekGoal(): number {
  const v = Number(localStorage.getItem(GOAL_KEY) || 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}
export function setWeekGoal(n: number): void {
  if (n > 0) localStorage.setItem(GOAL_KEY, String(Math.round(n)));
  else localStorage.removeItem(GOAL_KEY);
}
