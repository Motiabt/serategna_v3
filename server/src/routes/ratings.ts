import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { snapshotScore } from '../lib/score.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const ratingsRouter = Router();

// ── Two-way rating after a confirmed job ─────────────────────────────────────
ratingsRouter.post(
  '/',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        jobId: z.string(),
        stars: z.number().int().min(1).max(5),
        tags: z.array(z.string()).default([]),
        text: z.string().default(''),
      })
      .parse(req.body);

    const job = await prisma.job.findUnique({ where: { id: body.jobId } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.status !== 'confirmed') throw new HttpError(400, 'Can only rate confirmed jobs');

    const me = req.user!.sub;
    let rateeId: string;
    if (me === job.clientId) rateeId = job.workerId!;
    else if (me === job.workerId) rateeId = job.clientId;
    else throw new HttpError(403, 'You were not part of this job');

    const dup = await prisma.rating.findFirst({ where: { jobId: job.id, raterId: me } });
    if (dup) throw new HttpError(409, 'You already rated this job');

    const rating = await prisma.rating.create({
      data: {
        jobId: job.id,
        raterId: me,
        rateeId,
        stars: body.stars,
        tags: JSON.stringify(body.tags),
        text: body.text,
      },
    });

    // refresh ratee's average if they are a worker
    const agg = await prisma.rating.aggregate({ _avg: { stars: true }, where: { rateeId } });
    await prisma.workerProfile.updateMany({
      where: { userId: rateeId },
      data: { avgRating: agg._avg.stars ?? 0 },
    });
    if (rateeId === job.workerId) await snapshotScore(rateeId);

    res.status(201).json(rating);
  }),
);
