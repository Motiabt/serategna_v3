import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { computeScore } from '../lib/score.js';
import { workerBadges } from '../lib/badges.js';
import { ALL_ROLES, CATEGORIES } from '../lib/catalog.js';
import { ah, HttpError } from '../middleware/auth.js';

export const publicRouter = Router();

// ── Public authenticity check — for the verifiable Employment & Income
// Certificate. Returns a minimal, no-PII confirmation any third party (lender,
// landlord, employer) can use to confirm a certificate is genuine.
publicRouter.get(
  '/verify/:id',
  ah(async (req, res) => {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.params.id },
      include: { user: { select: { name: true, tier: true, createdAt: true } } },
    });
    if (!profile) throw new HttpError(404, 'Not found');
    const [score, confirmed] = await Promise.all([
      computeScore(profile.userId),
      prisma.job.findMany({ where: { workerId: profile.userId, status: 'confirmed' }, select: { agreedPrice: true } }),
    ]);
    const code = 'SRT-' + req.params.id.slice(-6).toUpperCase();
    res.json({
      verified: true,
      code,
      name: profile.user.name,
      faydaVerified: profile.user.tier >= 1,
      serategnaScore: score.score,
      band: score.band,
      jobsCompleted: profile.jobsCompleted,
      verifiedIncome: confirmed.reduce((a, j) => a + (j.agreedPrice ?? 0), 0),
      memberSince: profile.user.createdAt,
      checkedAt: new Date().toISOString(),
    });
  }),
);

// ── Public "Verified Income Passport" — no auth, no PII (no phone) ───────────
// A shareable proof of a worker's verified Serategna record. This is the
// portable financial identity made tangible: any employer or lender can verify.
publicRouter.get(
  '/worker/:id',
  ah(async (req, res) => {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.params.id },
      include: { user: { select: { name: true, tier: true, faydaStatus: true, createdAt: true } } },
    });
    if (!profile) throw new HttpError(404, 'Profile not found');

    const [score, ratings, confirmed, certs, psy, activeJob] = await Promise.all([
      computeScore(profile.userId),
      prisma.rating.findMany({ where: { rateeId: profile.userId }, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.job.findMany({ where: { workerId: profile.userId, status: 'confirmed' }, select: { agreedPrice: true } }),
      prisma.certification.findMany({ where: { userId: profile.userId, status: 'verified' } }),
      prisma.psychometricResult.findUnique({ where: { userId: profile.userId } }),
      // current engagement, if any (drives the live "on job / employed" status)
      prisma.job.findFirst({
        where: { workerId: profile.userId, status: { in: ['accepted', 'enroute', 'started', 'completed', 'paid'] } },
        select: { employmentType: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const cats: string[] = JSON.parse(profile.categories);
    const roleKeys: string[] = JSON.parse(profile.roles ?? '[]');
    const totalEarned = confirmed.reduce((a, j) => a + (j.agreedPrice ?? 0), 0);

    // Live work-status visibility shown on the worker's profile.
    const workStatus = activeJob
      ? activeJob.employmentType === 'permanent'
        ? 'employed'
        : 'on_job'
      : profile.availability === 'offline'
        ? 'offline'
        : 'available';

    res.json({
      name: profile.user.name,
      subCity: profile.subCity,
      memberSince: profile.user.createdAt,
      tier: profile.user.tier,
      verified: profile.user.tier >= 1,
      workStatus, // 'available' | 'on_job' | 'employed' | 'offline'
      score: score.score,
      band: score.band,
      jobsCompleted: profile.jobsCompleted,
      avgRating: profile.avgRating,
      verifiedIncome: totalEarned,
      categories: cats.map((c) => CATEGORIES.find((x) => x.key === c)?.en ?? c),
      skills: roleKeys.map((rk) => ALL_ROLES.find((r) => r.k === rk)?.en).filter(Boolean),
      reliabilityIndex: psy?.reliabilityIndex ?? null,
      certifications: certs.map((c) => ({ name: c.name, institution: c.institution, year: c.year })),
      badges: workerBadges({
        tier: profile.user.tier,
        avgRating: profile.avgRating,
        jobsCompleted: profile.jobsCompleted,
        completionRate: profile.completionRate,
        score: score.score,
        certified: certs.length > 0,
        reliability: psy?.reliabilityIndex ?? 0,
      }),
      ratings: ratings.map((r) => ({ stars: r.stars, text: r.text, tags: JSON.parse(r.tags) })),
    });
  }),
);
