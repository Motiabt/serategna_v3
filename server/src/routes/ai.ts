import { Router } from 'express';
import { z } from 'zod';
import { generateCv, draftJob, parseCvText, parseLicenseText } from '../lib/ai.js';
import { prisma } from '../lib/prisma.js';
import { notify } from '../lib/notifications.js';
import { ah, authRequired } from '../middleware/auth.js';

export const aiRouter = Router();

// ── AI CV builder (worker) ───────────────────────────────────────────────────
aiRouter.get(
  '/cv',
  authRequired,
  ah(async (req, res) => {
    const cv = await generateCv(req.user!.sub);
    res.json(cv);
  }),
);

// ── AI CV import: paste/upload CV text → auto-fill worker profile ────────────
aiRouter.post(
  '/cv-import',
  authRequired,
  ah(async (req, res) => {
    const { text } = z.object({ text: z.string().min(10) }).parse(req.body);
    const parsed = parseCvText(text);

    const existing = await prisma.workerProfile.findUnique({ where: { userId: req.user!.sub } });
    const mergedCats = Array.from(new Set([...(existing ? JSON.parse(existing.categories) : []), ...parsed.categories]));
    const mergedRoles = Array.from(new Set([...(existing ? JSON.parse(existing.roles ?? '[]') : []), ...parsed.roles]));

    await prisma.workerProfile.upsert({
      where: { userId: req.user!.sub },
      create: {
        userId: req.user!.sub,
        categories: JSON.stringify(parsed.categories),
        roles: JSON.stringify(parsed.roles),
        bio: parsed.bio,
      },
      update: {
        categories: JSON.stringify(mergedCats),
        roles: JSON.stringify(mergedRoles),
        ...(existing && !existing.bio ? { bio: parsed.bio } : {}),
      },
    });
    await prisma.user.update({ where: { id: req.user!.sub }, data: { isWorker: true } });
    const cv = await generateCv(req.user!.sub);
    res.json({ parsed, cv });
  }),
);

// ── Business license import: paste/upload license text → company profile ─────
aiRouter.post(
  '/license-import',
  authRequired,
  ah(async (req, res) => {
    const { text } = z.object({ text: z.string().min(10) }).parse(req.body);
    const p = parseLicenseText(text);
    const profile = await prisma.businessProfile.upsert({
      where: { userId: req.user!.sub },
      create: { userId: req.user!.sub, ...p },
      update: p,
    });
    await prisma.user.update({ where: { id: req.user!.sub }, data: { accountType: 'business' } });
    await notify({ userId: req.user!.sub, templateKey: 'business.profile_created' });
    res.json({ parsed: p, profile });
  }),
);

aiRouter.get(
  '/business-profile',
  authRequired,
  ah(async (req, res) => {
    const profile = await prisma.businessProfile.findUnique({ where: { userId: req.user!.sub } });
    res.json(profile);
  }),
);

// ── Update company profile — logo, intro & name (shown as a brand on jobs) ───
aiRouter.patch(
  '/business-profile',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        companyName: z.string().min(2).max(80).optional(),
        about: z.string().max(600).optional(),
        // Logo as a data URL (PNG/JPG/SVG/WebP). Capped so a base64 blob can't
        // bloat the row; for scale this would move to object storage + a URL.
        logoUrl: z
          .string()
          .max(400_000)
          .refine((s) => s === '' || /^data:image\/(png|jpe?g|svg\+xml|webp);base64,/.test(s) || /^https?:\/\//.test(s), 'Logo must be an image data URL or https URL')
          .optional(),
      })
      .parse(req.body);
    const profile = await prisma.businessProfile.upsert({
      where: { userId: req.user!.sub },
      create: { userId: req.user!.sub, companyName: body.companyName ?? 'My company', about: body.about ?? '', logoUrl: body.logoUrl ?? '' },
      update: body,
    });
    await prisma.user.update({ where: { id: req.user!.sub }, data: { accountType: 'business' } }).catch(() => undefined);
    res.json(profile);
  }),
);

// ── AI job-posting assistant (client) ────────────────────────────────────────
aiRouter.post(
  '/job-draft',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        prompt: z.string().default(''),
        category: z.string(),
        subCity: z.string().default('Bole'),
        employmentType: z
          .enum(['gig', 'short_term', 'contract', 'permanent', 'group_hire'])
          .default('gig'),
      })
      .parse(req.body);
    const draft = await draftJob(body);
    res.json(draft);
  }),
);
