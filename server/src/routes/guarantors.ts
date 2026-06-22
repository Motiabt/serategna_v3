import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { buildGuarantorContract } from '../lib/contracts.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const guarantorsRouter = Router();

// ── Add a guarantor (worker) — creates a guarantor agreement to be signed ─────
guarantorsRouter.post(
  '/',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        phone: z.string().min(7),
        relationship: z.enum(['family', 'employer', 'community', 'iddir']).default('family'),
        amountCap: z.number().int().min(0).default(0),
      })
      .parse(req.body);

    const me = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!me) throw new HttpError(404, 'User not found');

    // generate the guarantor agreement
    const { title, body: md, termsJson } = buildGuarantorContract({
      guarantorName: body.name,
      workerName: me.name,
      amountCap: body.amountCap,
      relationship: body.relationship,
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: me.id, // worker initiates; signer is the guarantor (by phone, off-platform OK)
        type: 'guarantor',
        title,
        bodyMarkdown: md,
        termsJson,
        status: 'sent',
      },
    });

    const guarantor = await prisma.guarantor.create({
      data: {
        workerId: me.id,
        name: body.name,
        phone: body.phone,
        relationship: body.relationship,
        amountCap: body.amountCap,
        contractId: contract.id,
        status: 'pending',
      },
    });
    res.status(201).json({ guarantor, contract: { id: contract.id, title, bodyMarkdown: md } });
  }),
);

// ── My guarantors ────────────────────────────────────────────────────────────
guarantorsRouter.get(
  '/mine',
  authRequired,
  ah(async (req, res) => {
    const guarantors = await prisma.guarantor.findMany({
      where: { workerId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(guarantors);
  }),
);
