import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { PSY_QUESTIONS, scorePsychometric } from '../lib/psychometric.js';
import { snapshotScore } from '../lib/score.js';
import { skillLadder } from '../lib/skillLadder.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const credentialsRouter = Router();

// Skill → income ladder: the next certifications that raise this worker's wage.
credentialsRouter.get(
  '/ladder',
  authRequired,
  ah(async (req, res) => {
    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user!.sub } });
    const cats: string[] = profile ? JSON.parse(profile.categories) : [];
    const certs = await prisma.certification.findMany({ where: { userId: req.user!.sub }, select: { name: true } });
    res.json(skillLadder(cats, certs.map((c) => c.name)));
  }),
);

// ── Certifications ───────────────────────────────────────────────────────────
credentialsRouter.post(
  '/certifications',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        institution: z.string().min(2),
        refNo: z.string().optional(),
        year: z.string().optional(),
      })
      .parse(req.body);
    const cert = await prisma.certification.create({
      data: { userId: req.user!.sub, name: body.name, institution: body.institution, refNo: body.refNo ?? '', year: body.year ?? '' },
    });
    res.status(201).json(cert);
  }),
);

credentialsRouter.get(
  '/certifications/mine',
  authRequired,
  ah(async (req, res) => {
    res.json(await prisma.certification.findMany({ where: { userId: req.user!.sub }, orderBy: { createdAt: 'desc' }, take: 100 }));
  }),
);

// ── Psychometric assessment ──────────────────────────────────────────────────
credentialsRouter.get('/psychometric/questions', (_req, res) =>
  res.json(PSY_QUESTIONS.map(({ reverse, ...q }) => { void reverse; return q; })),
);

credentialsRouter.get(
  '/psychometric/mine',
  authRequired,
  ah(async (req, res) => {
    const r = await prisma.psychometricResult.findUnique({ where: { userId: req.user!.sub } });
    res.json(r ? { ...r, traits: JSON.parse(r.traits) } : null);
  }),
);

credentialsRouter.post(
  '/psychometric',
  authRequired,
  ah(async (req, res) => {
    const { answers } = z
      .object({ answers: z.array(z.object({ q: z.string(), value: z.number().min(1).max(5) })).min(1) })
      .parse(req.body);
    const { reliabilityIndex, traits } = scorePsychometric(answers);
    const result = await prisma.psychometricResult.upsert({
      where: { userId: req.user!.sub },
      create: { userId: req.user!.sub, answers: JSON.stringify(answers), reliabilityIndex, traits: JSON.stringify(traits) },
      update: { answers: JSON.stringify(answers), reliabilityIndex, traits: JSON.stringify(traits) },
    });
    // reliability feeds the Serategna Score
    await snapshotScore(req.user!.sub).catch(() => undefined);
    res.json({ reliabilityIndex, traits, id: result.id });
  }),
);

export function hasVerifiedCert(userId: string) {
  return prisma.certification.count({ where: { userId, status: 'verified' } });
}
