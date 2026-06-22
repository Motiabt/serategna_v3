import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { distanceKm } from '../lib/geo.js';
import { computeScore } from '../lib/score.js';
import { matchScore, matchReasons } from '../lib/matching.js';
import { MATCH_THRESHOLD } from '../lib/subscription.js';
import { workerBadges } from '../lib/badges.js';
import { pageParams, MAX_SCAN } from '../lib/paginate.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const profilesRouter = Router();

// ── Update own worker profile ────────────────────────────────────────────────
profilesRouter.patch(
  '/me/worker',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        categories: z.array(z.string()).optional(),
        roles: z.array(z.string()).optional(),
        bio: z.string().optional(),
        subCity: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        serviceRadiusKm: z.number().min(1).max(50).optional(),
        availability: z.enum(['available', 'busy', 'offline']).optional(),
        instantDispatch: z.boolean().optional(),
        femaleClientOnly: z.boolean().optional(),
      })
      .parse(req.body);

    const data: Record<string, unknown> = { ...body };
    if (body.categories) data.categories = JSON.stringify(body.categories);
    if (body.roles) data.roles = JSON.stringify(body.roles);

    const profile = await prisma.workerProfile.upsert({
      where: { userId: req.user!.sub },
      create: { userId: req.user!.sub, ...data },
      update: data,
    });
    res.json(serializeProfile(profile));
  }),
);

// ── Browse workers (geo + category filter, ranked by score) ──────────────────
profilesRouter.get(
  '/workers',
  authRequired,
  ah(async (req, res) => {
    const q = z
      .object({
        category: z.string().optional(),
        role: z.string().optional(),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        radiusKm: z.coerce.number().default(15),
        femaleClientOnly: z.coerce.boolean().optional(),
      })
      .parse(req.query);

    const { take, skip } = pageParams(req.query);
    // Bound the candidate scan so the query can never pull an unbounded set.
    const profiles = await prisma.workerProfile.findMany({
      where: { availability: { not: 'offline' } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_SCAN,
    });

    let workers = profiles.map((p) => ({
      ...serializeProfile(p),
      name: p.user.name,
      tier: p.user.tier,
      faydaStatus: p.user.faydaStatus,
      distanceKm:
        q.lat !== undefined && q.lng !== undefined
          ? Number(distanceKm({ lat: q.lat, lng: q.lng }, { lat: p.lat, lng: p.lng }).toFixed(1))
          : null,
    }));

    if (q.category) workers = workers.filter((w) => w.categories.includes(q.category!));
    if (q.role) workers = workers.filter((w) => w.roles.includes(q.role!));
    if (q.femaleClientOnly !== undefined)
      workers = workers.filter((w) => !w.femaleClientOnly || q.femaleClientOnly);
    if (q.lat !== undefined && q.lng !== undefined)
      workers = workers.filter((w) => (w.distanceKm ?? 0) <= q.radiusKm);

    // attach live score + interlinked match score, then rank by relevance
    const withScores = await Promise.all(
      workers.map(async (w) => {
        const s = await computeScore(w.userId);
        const mi = {
          distanceKm: w.distanceKm,
          categoryMatch: q.category ? w.categories.includes(q.category) : true,
          roleMatch: q.role ? w.roles.includes(q.role) : false,
          rating: w.avgRating,
          score: s.score,
          verified: w.tier >= 1,
          available: w.availability === 'available',
        };
        const relevance = matchScore(mi, q.radiusKm);
        const badges = workerBadges({ tier: w.tier, avgRating: w.avgRating, jobsCompleted: w.jobsCompleted, completionRate: w.completionRate, score: s.score });
        return { ...w, score: s.score, band: s.band, matchScore: relevance, matchReasons: matchReasons(mi, q.radiusKm), badges };
      }),
    );
    withScores.sort((a, b) => b.matchScore - a.matchScore);

    // Hard gate: only surface workers who are an ≥80% match to the search,
    // then return a single bounded page.
    const gated = withScores.filter((w) => w.matchScore >= MATCH_THRESHOLD);
    res.json(gated.slice(skip, skip + take));
  }),
);

// ── Single worker card ───────────────────────────────────────────────────────
profilesRouter.get(
  '/workers/:id',
  authRequired,
  ah(async (req, res) => {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.params.id },
      include: { user: true },
    });
    if (!profile) throw new HttpError(404, 'Worker not found');
    const score = await computeScore(profile.userId);
    const ratings = await prisma.rating.findMany({
      where: { rateeId: profile.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    res.json({
      ...serializeProfile(profile),
      name: profile.user.name,
      tier: profile.user.tier,
      faydaStatus: profile.user.faydaStatus,
      score: score.score,
      band: score.band,
      badges: workerBadges({ tier: profile.user.tier, avgRating: profile.avgRating, jobsCompleted: profile.jobsCompleted, completionRate: profile.completionRate, score: score.score }),
      ratings: ratings.map((r) => ({
        stars: r.stars,
        text: r.text,
        tags: JSON.parse(r.tags),
        createdAt: r.createdAt,
      })),
    });
  }),
);

export function serializeProfile(p: {
  userId: string;
  categories: string;
  roles?: string;
  bio: string;
  subCity: string;
  lat: number;
  lng: number;
  serviceRadiusKm: number;
  availability: string;
  instantDispatch: boolean;
  femaleClientOnly: boolean;
  vouchedById: string | null;
  completionRate: number;
  avgRating: number;
  jobsCompleted: number;
}) {
  return {
    userId: p.userId,
    categories: JSON.parse(p.categories) as string[],
    roles: JSON.parse(p.roles ?? '[]') as string[],
    bio: p.bio,
    subCity: p.subCity,
    lat: p.lat,
    lng: p.lng,
    serviceRadiusKm: p.serviceRadiusKm,
    availability: p.availability,
    instantDispatch: p.instantDispatch,
    femaleClientOnly: p.femaleClientOnly,
    vouchedById: p.vouchedById,
    completionRate: p.completionRate,
    avgRating: p.avgRating,
    jobsCompleted: p.jobsCompleted,
  };
}
