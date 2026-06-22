import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const identityRouter = Router();

// ── Submit Fayda verification (Tier 0 → Tier 1) ──────────────────────────────
identityRouter.post(
  '/verify',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        faydaNumber: z.string().min(6),
        docRef: z.string().optional(),
        selfieRef: z.string().optional(),
      })
      .parse(req.body);

    const existing = await prisma.verificationRequest.findFirst({
      where: { userId: req.user!.sub, status: 'pending' },
    });
    if (existing) throw new HttpError(409, 'A verification request is already pending');

    const request = await prisma.verificationRequest.create({
      data: {
        userId: req.user!.sub,
        faydaNumber: body.faydaNumber,
        docRef: body.docRef,
        selfieRef: body.selfieRef,
      },
    });
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { faydaStatus: 'pending', faydaNumber: body.faydaNumber },
    });
    res.status(201).json({ request, status: 'pending' });
  }),
);

// ── Verification status ──────────────────────────────────────────────────────
identityRouter.get(
  '/status',
  authRequired,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    const latest = await prisma.verificationRequest.findFirst({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tier: user?.tier ?? 0, faydaStatus: user?.faydaStatus ?? 'none', request: latest });
  }),
);
