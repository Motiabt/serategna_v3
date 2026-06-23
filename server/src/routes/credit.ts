import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { creditReadiness } from '../lib/credit.js';
import { advanceQuote, acceptAdvance, activeAdvance } from '../lib/advance.js';
import { notify } from '../lib/notifications.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const creditRouter = Router();

// Worker's credit readiness + indicative offers (no money is held or lent here).
creditRouter.get(
  '/me',
  authRequired,
  ah(async (req, res) => {
    const [readiness, advance] = await Promise.all([
      creditReadiness(req.user!.sub),
      activeAdvance(req.user!.sub),
    ]);
    res.json({ ...readiness, activeAdvance: advance });
  }),
);

// Earned-wage advance: quote (how much + fee), then accept to disburse.
creditRouter.get(
  '/advance',
  authRequired,
  ah(async (req, res) => {
    res.json(await advanceQuote(req.user!.sub));
  }),
);

creditRouter.post(
  '/advance/accept',
  authRequired,
  ah(async (req, res) => {
    const body = z.object({ amount: z.number().int().positive(), method: z.string().max(20).optional() }).parse(req.body);
    try {
      const adv = await acceptAdvance(req.user!.sub, body.amount, body.method ?? 'telebirr');
      await notify({
        userId: req.user!.sub,
        templateKey: 'system',
        title: 'Advance disbursed',
        body: `ETB ${adv.principal.toLocaleString()} is on its way to your ${adv.method}. Repaid automatically from your next jobs (fee ETB ${adv.fee.toLocaleString()}).`,
        type: 'payout',
        link: '/app/credit',
      }).catch(() => undefined);
      res.status(201).json({ ok: true, advance: adv });
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : 'Could not process advance');
    }
  }),
);

// Apply / request a callback from the partner lender (captured as a lead).
creditRouter.post(
  '/apply',
  authRequired,
  ah(async (req, res) => {
    const body = z.object({ product: z.string().default('advance'), amount: z.number().int().nonnegative().default(0) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, select: { name: true, phone: true } });
    await prisma.lead.create({
      data: {
        kind: 'callback',
        name: user?.name ?? 'Worker',
        org: 'Credit',
        contact: user?.phone ?? '',
        pkg: body.product,
        message: `Credit application · product: ${body.product} · requested ETB ${body.amount.toLocaleString()}`,
      },
    });
    res.status(201).json({ ok: true });
  }),
);
