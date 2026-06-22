import { Router } from 'express';
import { z } from 'zod';
import { getSub, activate, PLANS, EMPLOYER_POST_LIMIT, WORKER_APP_LIMIT } from '../lib/subscription.js';
import { prisma } from '../lib/prisma.js';
import { paymentAdapter } from '../lib/payments.js';
import { notify } from '../lib/notifications.js';
import { ah, authRequired } from '../middleware/auth.js';

export const subscriptionRouter = Router();

// ── My subscription / quota status ───────────────────────────────────────────
subscriptionRouter.get(
  '/',
  authRequired,
  ah(async (req, res) => {
    const sub = await getSub(req.user!.sub, req.user!.roles.worker && !req.user!.roles.client ? 'worker' : 'employer');
    // First job post is free for a brand-new employer (no posts ever).
    const everPosted = await prisma.job.count({ where: { clientId: req.user!.sub } });
    const freePostAvailable = sub.status !== 'active' && everPosted === 0;
    res.json({
      plan: sub.plan,
      status: sub.status,
      freePostAvailable,
      hasPostedBefore: everPosted > 0,
      currentPeriodEnd: sub.currentPeriodEnd,
      postsThisMonth: sub.postsThisMonth,
      postsRemaining: Math.max(0, EMPLOYER_POST_LIMIT - sub.postsThisMonth),
      postLimit: EMPLOYER_POST_LIMIT,
      appsThisMonth: sub.appsThisMonth,
      appsRemaining: Math.max(0, WORKER_APP_LIMIT - sub.appsThisMonth),
      appLimit: WORKER_APP_LIMIT,
      plans: PLANS,
    });
  }),
);

// ── Subscribe (employer) — collected through a licensed PSP, NOT directly ─────
// Serategna's own fee is initiated via the payment aggregator (Chapa-class).
// The mock adapter confirms instantly (dev); a real PSP returns a hosted
// checkout URL and the subscription activates on the signed webhook.
subscriptionRouter.post(
  '/subscribe',
  authRequired,
  ah(async (req, res) => {
    const { plan, method } = z
      .object({ plan: z.enum(['monthly', 'annual']), method: z.enum(['telebirr', 'cbe_birr', 'card']).default('telebirr') })
      .parse(req.body);
    const amount = PLANS[plan].price;
    const reference = `sub_${req.user!.sub}_${plan}_${Date.now()}`;
    const pay = await paymentAdapter().initiate({ jobId: reference, amount, method, reference });

    if (pay.status === 'confirmed') {
      const sub = await activate(req.user!.sub, plan);
      await notify({ userId: req.user!.sub, templateKey: 'subscription.active', title: 'Subscription active', body: `Payment received via ${paymentAdapter().name}. You can post up to ${EMPLOYER_POST_LIMIT} jobs this month.`, type: 'system' });
      return res.json({ ok: true, paid: true, plan: sub.plan, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, price: amount, externalRef: pay.externalRef });
    }
    // Hosted checkout — keep the chosen plan pending; webhook activates on pay.
    await getSub(req.user!.sub, 'employer');
    await prisma.subscription.update({ where: { userId: req.user!.sub }, data: { plan } });
    res.status(202).json({ ok: true, paid: false, status: 'pending', checkoutUrl: pay.checkoutUrl, price: amount, externalRef: pay.externalRef });
  }),
);
