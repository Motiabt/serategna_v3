import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { TERMS, PRIVACY, LEGAL_VERSION } from '../lib/legal.js';
import { ah, authRequired } from '../middleware/auth.js';

export const legalRouter = Router();

legalRouter.get('/terms', (_req, res) => res.json(TERMS));
legalRouter.get('/privacy', (_req, res) => res.json(PRIVACY));

// ── Record a consent (consent ledger, Proclamation 1321/2024) ────────────────
legalRouter.post(
  '/consent',
  authRequired,
  ah(async (req, res) => {
    const { document } = z
      .object({
        document: z.enum(['terms', 'privacy', 'data_sharing', 'contractor_agreement']),
      })
      .parse(req.body);
    const consent = await prisma.consent.create({
      data: { userId: req.user!.sub, document, version: LEGAL_VERSION },
    });
    res.status(201).json(consent);
  }),
);

legalRouter.get(
  '/consent/mine',
  authRequired,
  ah(async (req, res) => {
    const consents = await prisma.consent.findMany({
      where: { userId: req.user!.sub, revokedAt: null },
      take: 100,
    });
    res.json(consents);
  }),
);
