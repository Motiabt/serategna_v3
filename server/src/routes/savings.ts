import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, authRequired } from '../middleware/auth.js';

export const savingsRouter = Router();

// Iqub-style savings goal. NOTIONAL only — Serategna holds no money. A % of each
// confirmed payment is recorded toward the worker's goal (a habit + a verifiable
// savings record that strengthens their credit profile).
savingsRouter.get(
  '/',
  authRequired,
  ah(async (req, res) => {
    const goal = await prisma.savingsGoal.findUnique({ where: { userId: req.user!.sub } });
    res.json(goal);
  }),
);

savingsRouter.post(
  '/',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({ label: z.string().max(60).optional(), targetAmount: z.number().int().min(0).max(10_000_000), ratePct: z.number().int().min(1).max(50).default(10) })
      .parse(req.body);
    const goal = await prisma.savingsGoal.upsert({
      where: { userId: req.user!.sub },
      create: { userId: req.user!.sub, label: body.label ?? 'My iqub goal', targetAmount: body.targetAmount, ratePct: body.ratePct },
      update: { label: body.label, targetAmount: body.targetAmount, ratePct: body.ratePct },
    });
    res.json(goal);
  }),
);
