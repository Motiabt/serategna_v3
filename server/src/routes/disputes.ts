import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const disputesRouter = Router();

// ── Open a dispute (within 24h of completion, spec B2.1) ─────────────────────
disputesRouter.post(
  '/',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        jobId: z.string(),
        reason: z.string().min(3),
        evidence: z.array(z.string()).default([]),
      })
      .parse(req.body);

    const job = await prisma.job.findUnique({ where: { id: body.jobId } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.clientId !== req.user!.sub && job.workerId !== req.user!.sub)
      throw new HttpError(403, 'You were not part of this job');

    const dispute = await prisma.dispute.create({
      data: {
        jobId: job.id,
        openerId: req.user!.sub,
        reason: body.reason,
        evidence: JSON.stringify(body.evidence),
      },
    });
    await prisma.job.update({ where: { id: job.id }, data: { status: 'disputed' } });
    res.status(201).json(dispute);
  }),
);

// ── My disputes ──────────────────────────────────────────────────────────────
disputesRouter.get(
  '/mine',
  authRequired,
  ah(async (req, res) => {
    const disputes = await prisma.dispute.findMany({
      where: { OR: [{ openerId: req.user!.sub }, { job: { workerId: req.user!.sub } }] },
      include: { job: { select: { title: true } } },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });
    res.json(disputes);
  }),
);
