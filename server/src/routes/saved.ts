import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { computeScore } from '../lib/score.js';
import { ah, authRequired } from '../middleware/auth.js';

export const savedRouter = Router();

// ── Toggle save (shortlist a worker / bookmark a job) ────────────────────────
savedRouter.post(
  '/',
  authRequired,
  ah(async (req, res) => {
    const { kind, refId } = z
      .object({ kind: z.enum(['worker', 'job']), refId: z.string() })
      .parse(req.body);
    const where = { userId_kind_refId: { userId: req.user!.sub, kind, refId } };
    const existing = await prisma.savedItem.findUnique({ where });
    if (existing) {
      await prisma.savedItem.delete({ where });
      return res.json({ saved: false });
    }
    await prisma.savedItem.create({ data: { userId: req.user!.sub, kind, refId } });
    res.json({ saved: true });
  }),
);

// ── List saved items (hydrated) ──────────────────────────────────────────────
savedRouter.get(
  '/',
  authRequired,
  ah(async (req, res) => {
    const kind = z.object({ kind: z.enum(['worker', 'job']) }).parse(req.query).kind;
    const items = await prisma.savedItem.findMany({
      where: { userId: req.user!.sub, kind },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const ids = items.map((i) => i.refId);

    if (kind === 'worker') {
      const profiles = await prisma.workerProfile.findMany({
        where: { userId: { in: ids } },
        include: { user: true },
      });
      const hydrated = await Promise.all(
        profiles.map(async (p) => {
          const s = await computeScore(p.userId);
          return {
            userId: p.userId,
            name: p.user.name,
            subCity: p.subCity,
            avgRating: p.avgRating,
            jobsCompleted: p.jobsCompleted,
            tier: p.user.tier,
            categories: JSON.parse(p.categories),
            roles: JSON.parse(p.roles ?? '[]'),
            score: s.score,
            band: s.band,
          };
        }),
      );
      return res.json(hydrated);
    }

    const jobs = await prisma.job.findMany({ where: { id: { in: ids } } });
    res.json(
      jobs.map((j) => ({
        id: j.id,
        title: j.title,
        subCity: j.subCity,
        category: j.category,
        role: j.role,
        priceBandLow: j.priceBandLow,
        priceBandHigh: j.priceBandHigh,
        employmentType: j.employmentType,
        positions: j.positions,
        status: j.status,
      })),
    );
  }),
);
