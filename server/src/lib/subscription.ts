import { prisma } from './prisma.js';

// Plans & quotas (employer pays; worker is free with a monthly application quota).
export const PLANS = {
  monthly: { price: 100, label: 'Monthly', period: 'month' },
  annual: { price: 1000, label: 'Annual', period: 'year' },
};
export const EMPLOYER_POST_LIMIT = 5; // posts / month
export const WORKER_APP_LIMIT = 5; // applications / month

// Hard skill-match gate: a worker is only matched to / can only apply to a job
// when their relevance score is at least this. (Both directions.)
export const MATCH_THRESHOLD = 80;

function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getSub(userId: string, role: 'employer' | 'worker') {
  let sub = await prisma.subscription.findUnique({ where: { userId } });
  const mk = monthKey();
  if (!sub) {
    sub = await prisma.subscription.create({ data: { userId, role, monthAnchor: mk } });
  }
  // roll the monthly quota window
  if (sub.monthAnchor !== mk) {
    sub = await prisma.subscription.update({
      where: { userId },
      data: { monthAnchor: mk, postsThisMonth: 0, appsThisMonth: 0 },
    });
  }
  // expire lapsed subscriptions
  if (sub.status === 'active' && sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) {
    sub = await prisma.subscription.update({ where: { userId }, data: { status: 'inactive', plan: 'free' } });
  }
  return sub;
}

export async function canPost(userId: string): Promise<{ ok: boolean; reason?: string; remaining: number; sub: any }> {
  const sub = await getSub(userId, 'employer');
  if (sub.status !== 'active') {
    // First post is free — let a new employer try the platform before subscribing.
    const everPosted = await prisma.job.count({ where: { clientId: userId } });
    if (everPosted === 0) return { ok: true, reason: 'free_first', remaining: 1, sub };
    return { ok: false, reason: 'subscribe', remaining: 0, sub };
  }
  const remaining = EMPLOYER_POST_LIMIT - sub.postsThisMonth;
  if (remaining <= 0) return { ok: false, reason: 'limit', remaining: 0, sub };
  return { ok: true, remaining, sub };
}

export async function canApply(userId: string): Promise<{ ok: boolean; remaining: number; sub: any }> {
  const sub = await getSub(userId, 'worker');
  const remaining = WORKER_APP_LIMIT - sub.appsThisMonth;
  return { ok: remaining > 0, remaining: Math.max(0, remaining), sub };
}

export async function incrementPost(userId: string) {
  await prisma.subscription.update({ where: { userId }, data: { postsThisMonth: { increment: 1 } } });
}
export async function incrementApp(userId: string) {
  await prisma.subscription.update({ where: { userId }, data: { appsThisMonth: { increment: 1 } } });
}

export async function activate(userId: string, plan: 'monthly' | 'annual') {
  const end = new Date();
  if (plan === 'annual') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  await getSub(userId, 'employer');
  return prisma.subscription.update({
    where: { userId },
    data: { role: 'employer', plan, status: 'active', currentPeriodEnd: end },
  });
}
