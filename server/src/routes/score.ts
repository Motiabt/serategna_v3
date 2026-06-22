import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { computeScore, WEIGHTS } from '../lib/score.js';
import { ah, authRequired } from '../middleware/auth.js';

export const scoreRouter = Router();

// ── My live Serategna Score + credit-eligibility projection ──────────────────
scoreRouter.get(
  '/me',
  authRequired,
  ah(async (req, res) => {
    const workerId = req.user!.sub;
    const result = await computeScore(workerId);
    const history = await prisma.scoreSnapshot.findMany({
      where: { workerId },
      orderBy: { computedAt: 'asc' },
      take: 30,
    });

    // Credit-eligibility projection (spec B1.2): Tier 2 needs Score >= 620 +
    // 6 months history. Project when the worker reaches it at current pace.
    const CREDIT_THRESHOLD = 620;
    const recent = history.slice(-4).map((h) => h.score);
    const slope =
      recent.length >= 2 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 8;
    let projection: string | null = null;
    if (result.score >= CREDIT_THRESHOLD) {
      projection = 'You are credit-eligible — keep your streak to qualify for nano-loans.';
    } else if (slope > 0) {
      const weeks = Math.ceil((CREDIT_THRESHOLD - result.score) / slope);
      const date = new Date(Date.now() + weeks * 7 * 86400000);
      projection = `At this pace you reach Credit-Eligible around ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`;
    } else {
      projection = 'Complete more on-platform jobs to grow your Score toward credit eligibility.';
    }

    res.json({
      ...result,
      threshold: CREDIT_THRESHOLD,
      projection,
      weights: WEIGHTS,
      history: history.map((h) => ({ score: h.score, computedAt: h.computedAt })),
    });
  }),
);
