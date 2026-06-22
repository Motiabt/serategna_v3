import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { creditReadiness } from '../lib/credit.js';
import { ah, authRequired } from '../middleware/auth.js';

export const creditRouter = Router();

// Worker's credit readiness + indicative offers (no money is held or lent here).
creditRouter.get(
  '/me',
  authRequired,
  ah(async (req, res) => {
    res.json(await creditReadiness(req.user!.sub));
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
