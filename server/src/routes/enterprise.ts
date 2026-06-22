import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ENTERPRISE_PACKAGES, TALENT_POOLS, SPECIAL_TALENTS, ENTERPRISE_STATS, CONTACT } from '../lib/enterprise.js';
import { centroid } from '../lib/geo.js';
import { CATEGORIES } from '../lib/catalog.js';
import { wageFloor } from '../lib/wage.js';
import { notify } from '../lib/notifications.js';
import { cacheControl } from '../middleware/cache.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const enterpriseRouter = Router();
const marketingCache = cacheControl(600); // packages/overview/contact change rarely

/** The caller's enterprise membership (with the enterprise), or null. */
async function memberOf(userId: string) {
  return prisma.enterpriseMember.findFirst({ where: { userId }, include: { enterprise: true } });
}
async function requireMember(userId: string) {
  const m = await memberOf(userId);
  if (!m) throw new HttpError(403, 'You are not a member of an enterprise account.');
  return m;
}

// Public: packages + contact (used by the landing page and the in-app section).
enterpriseRouter.get('/packages', marketingCache, (_req, res) => res.json(ENTERPRISE_PACKAGES));
enterpriseRouter.get('/contact', marketingCache, (_req, res) => res.json(CONTACT));

// Public: everything the enterprise mini-site needs in one call.
enterpriseRouter.get('/overview', marketingCache, (_req, res) =>
  res.json({ packages: ENTERPRISE_PACKAGES, talentPools: TALENT_POOLS, specialTalents: SPECIAL_TALENTS, stats: ENTERPRISE_STATS, contact: CONTACT }),
);

// Public: enterprise inquiry / callback / support lead capture.
enterpriseRouter.post(
  '/lead',
  ah(async (req, res) => {
    const body = z
      .object({
        kind: z.enum(['enterprise', 'callback', 'support']).default('enterprise'),
        name: z.string().min(2),
        org: z.string().optional(),
        contact: z.string().min(5),
        pkg: z.string().optional(),
        orgSize: z.string().optional(),
        roles: z.string().optional(),
        message: z.string().optional(),
      })
      .parse(req.body);
    // Fold the richer enterprise fields into the stored message (no schema change).
    const extras = [
      body.orgSize ? `Org size: ${body.orgSize}` : '',
      body.roles ? `Roles needed: ${body.roles}` : '',
      body.message ?? '',
    ].filter(Boolean).join(' · ');
    const lead = await prisma.lead.create({
      data: { kind: body.kind, name: body.name, org: body.org ?? '', contact: body.contact, pkg: body.pkg ?? '', message: extras },
    });
    res.status(201).json({ ok: true, id: lead.id });
  }),
);

// ════════════════════════════════════════════════════════════════════════════
// Enterprise ACCOUNT (functional, member-gated). Role access is real: an admin
// holds the account; managers are seats the admin provisions after the
// agreement. Members share one talent pool and post jobs at scale.
// ════════════════════════════════════════════════════════════════════════════

// The console payload for whichever enterprise the caller belongs to (or null).
enterpriseRouter.get(
  '/me',
  authRequired,
  ah(async (req, res) => {
    const m = await memberOf(req.user!.sub);
    if (!m) return res.json({ enterprise: null });
    const e = m.enterprise;
    const [members, talentCount, posts] = await Promise.all([
      prisma.enterpriseMember.findMany({ where: { enterpriseId: e.id }, orderBy: { createdAt: 'asc' } }),
      prisma.enterpriseTalent.count({ where: { enterpriseId: e.id } }),
      prisma.job.count({ where: { clientId: e.ownerId } }),
    ]);
    const users = await prisma.user.findMany({ where: { id: { in: members.map((x) => x.userId) } }, select: { id: true, name: true, phone: true } });
    const byId = new Map(users.map((u) => [u.id, u]));
    const pkg = ENTERPRISE_PACKAGES.find((p) => p.key === e.packageKey);
    res.json({
      enterprise: { id: e.id, name: e.name, packageKey: e.packageKey, packageName: pkg?.name ?? e.packageKey, status: e.status, seats: e.seats, logoUrl: e.logoUrl, about: e.about, agreementRef: e.agreementRef },
      role: m.role,
      seatsUsed: members.length,
      talentCount,
      posts,
      members: members.map((x) => ({ id: x.id, role: x.role, title: x.title, name: byId.get(x.userId)?.name ?? '—', phone: byId.get(x.userId)?.phone ?? '' })),
    });
  }),
);

// Admin-only: provision a manager seat (role access) by phone of an existing user.
enterpriseRouter.post(
  '/members',
  authRequired,
  ah(async (req, res) => {
    const m = await requireMember(req.user!.sub);
    if (m.role !== 'admin') throw new HttpError(403, 'Only an enterprise admin can manage seats.');
    const body = z.object({ phone: z.string().min(7), title: z.string().max(60).optional() }).parse(req.body);
    const used = await prisma.enterpriseMember.count({ where: { enterpriseId: m.enterpriseId } });
    if (used >= m.enterprise.seats) throw new HttpError(403, `Seat limit reached (${m.enterprise.seats}). Upgrade your package to add more.`);
    const user = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (!user) throw new HttpError(404, 'No Serategna user with that phone — ask them to sign up first.');
    const dup = await prisma.enterpriseMember.findUnique({ where: { enterpriseId_userId: { enterpriseId: m.enterpriseId, userId: user.id } } });
    if (dup) throw new HttpError(409, 'That person is already a member.');
    const created = await prisma.enterpriseMember.create({ data: { enterpriseId: m.enterpriseId, userId: user.id, role: 'manager', title: body.title ?? '' } });
    await notify({ userId: user.id, templateKey: 'system', title: 'Enterprise access granted', body: `You're now a manager on ${m.enterprise.name}.`, type: 'system' }).catch(() => undefined);
    res.status(201).json({ ok: true, id: created.id });
  }),
);

// Shared talent pool — list.
enterpriseRouter.get(
  '/talent',
  authRequired,
  ah(async (req, res) => {
    const m = await requireMember(req.user!.sub);
    const pool = await prisma.enterpriseTalent.findMany({ where: { enterpriseId: m.enterpriseId }, orderBy: { createdAt: 'desc' }, take: 200 });
    const profs = await prisma.workerProfile.findMany({ where: { userId: { in: pool.map((p) => p.workerId) } }, include: { user: { select: { name: true } } } });
    const byId = new Map(profs.map((p) => [p.userId, p]));
    res.json(pool.map((p) => { const wp = byId.get(p.workerId); return { workerId: p.workerId, note: p.note, name: wp?.user.name ?? '—', subCity: wp?.subCity ?? '', avgRating: wp?.avgRating ?? 0, jobsCompleted: wp?.jobsCompleted ?? 0 }; }));
  }),
);

// Shared talent pool — add a worker.
enterpriseRouter.post(
  '/talent',
  authRequired,
  ah(async (req, res) => {
    const m = await requireMember(req.user!.sub);
    const body = z.object({ workerId: z.string(), note: z.string().max(200).optional() }).parse(req.body);
    await prisma.enterpriseTalent.upsert({
      where: { enterpriseId_workerId: { enterpriseId: m.enterpriseId, workerId: body.workerId } },
      create: { enterpriseId: m.enterpriseId, workerId: body.workerId, note: body.note ?? '' },
      update: { note: body.note ?? '' },
    });
    res.status(201).json({ ok: true });
  }),
);

// Enterprise's posted jobs.
enterpriseRouter.get(
  '/jobs',
  authRequired,
  ah(async (req, res) => {
    const m = await requireMember(req.user!.sub);
    const jobs = await prisma.job.findMany({
      where: { clientId: m.enterprise.ownerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { _count: { select: { bids: true } } },
    });
    res.json(jobs.map((j) => ({ id: j.id, title: j.title, status: j.status, category: j.category, positions: j.positions, filledPositions: j.filledPositions, bidCount: j._count.bids, createdAt: j.createdAt })));
  }),
);

// Bulk-post jobs at scale (under the enterprise's account, no subscription gate).
enterpriseRouter.post(
  '/bulk-post',
  authRequired,
  ah(async (req, res) => {
    const m = await requireMember(req.user!.sub);
    const body = z.object({
      jobs: z.array(z.object({
        category: z.string(),
        title: z.string().min(2),
        subCity: z.string().default('Bole'),
        positions: z.number().int().min(1).max(50).default(1),
        employmentType: z.enum(['gig', 'short_term', 'contract', 'permanent', 'group_hire']).default('group_hire'),
        rateType: z.enum(['fixed', 'hourly', 'daily', 'weekly', 'monthly']).default('monthly'),
        fixedPrice: z.number().int().positive().optional(),
      })).min(1).max(20),
    }).parse(req.body);

    const ids: string[] = [];
    for (const j of body.jobs) {
      const floor = wageFloor(j.rateType, false);
      if (j.fixedPrice != null && j.fixedPrice < floor) {
        throw new HttpError(400, `"${j.title}" is below the minimum of ETB ${floor.toLocaleString()} ${j.rateType}. Fair pay protects workers.`);
      }
      const band = await prisma.priceBand.findUnique({ where: { category_subCity: { category: j.category, subCity: j.subCity } } });
      const point = centroid(j.subCity);
      const vertical = CATEGORIES.find((c) => c.key === j.category)?.vertical ?? 'home';
      const job = await prisma.job.create({
        data: {
          clientId: m.enterprise.ownerId,
          category: j.category,
          vertical,
          title: j.title,
          description: `Posted by ${m.enterprise.name} via Serategna Enterprise.`,
          subCity: j.subCity,
          lat: point.lat,
          lng: point.lng,
          pricingMode: j.fixedPrice != null ? 'fixed' : 'bid',
          priceBandLow: band?.low ?? 0,
          priceBandHigh: band?.high ?? 0,
          agreedPrice: j.fixedPrice ?? null,
          status: 'open',
          employmentType: j.employmentType,
          formality: 'formal',
          rateType: j.rateType,
          positions: j.positions,
          expiresAt: new Date(Date.now() + 14 * 86400000),
        },
      });
      ids.push(job.id);
    }
    res.status(201).json({ ok: true, count: ids.length, ids });
  }),
);

// User management: admin removes a manager seat (cannot remove an admin/owner).
enterpriseRouter.delete(
  '/members/:memberId',
  authRequired,
  ah(async (req, res) => {
    const m = await requireMember(req.user!.sub);
    if (m.role !== 'admin') throw new HttpError(403, 'Only an enterprise admin can manage seats.');
    const target = await prisma.enterpriseMember.findUnique({ where: { id: req.params.memberId } });
    if (!target || target.enterpriseId !== m.enterpriseId) throw new HttpError(404, 'Member not found.');
    if (target.role === 'admin') throw new HttpError(400, 'You cannot remove an admin seat.');
    await prisma.enterpriseMember.delete({ where: { id: target.id } });
    await notify({ userId: target.userId, templateKey: 'system', title: 'Enterprise access removed', body: `Your manager access to ${m.enterprise.name} was removed.`, type: 'system' }).catch(() => undefined);
    res.json({ ok: true });
  }),
);

// Job management: a member closes one of the enterprise's open postings.
enterpriseRouter.post(
  '/jobs/:jobId/close',
  authRequired,
  ah(async (req, res) => {
    const m = await requireMember(req.user!.sub);
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job || job.clientId !== m.enterprise.ownerId) throw new HttpError(404, 'Job not found in this enterprise.');
    if (job.status !== 'open') throw new HttpError(400, 'Only open postings can be closed.');
    await prisma.job.update({ where: { id: job.id }, data: { status: 'cancelled' } });
    res.json({ ok: true, status: 'cancelled' });
  }),
);

// ════════════════════════════════════════════════════════════════════════════
// ENTERPRISE ATS — the full hiring funnel runs on the WEB console:
// post → shortlist → interview (schedule + call/notify) → offer → hire.
// Each applicant is a Bid; `stage` carries the pipeline position.
// ════════════════════════════════════════════════════════════════════════════

const ATS_STAGES = ['applied', 'shortlisted', 'interview', 'offer', 'hired', 'declined'] as const;

// Onboarding checklist seeded when an applicant reaches offer/hired. `key` lets
// the web client localize each label; `label` is the English fallback.
const DEFAULT_ONBOARDING = [
  { key: 'onbId', label: 'ID & Fayda verified', done: false },
  { key: 'onbContract', label: 'Contract signed', done: false },
  { key: 'onbStart', label: 'Start date confirmed', done: false },
  { key: 'onbOrientation', label: 'Orientation completed', done: false },
];

/** Load a job that belongs to the caller's enterprise, or 404. */
async function enterpriseJob(userId: string, jobId: string) {
  const m = await requireMember(userId);
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.clientId !== m.enterprise.ownerId) throw new HttpError(404, 'Job not found in this enterprise.');
  return { m, job };
}

function humanize(keys: unknown): string[] {
  try {
    const arr = JSON.parse(String(keys ?? '[]')) as string[];
    return arr.map((k) => k.replace(/_/g, ' ')).slice(0, 6);
  } catch { return []; }
}

// One job's applicant pipeline (joined with worker profile for the console card).
enterpriseRouter.get(
  '/jobs/:jobId/applicants',
  authRequired,
  ah(async (req, res) => {
    const { job } = await enterpriseJob(req.user!.sub, req.params.jobId);
    const bids = await prisma.bid.findMany({ where: { jobId: job.id }, orderBy: [{ stage: 'asc' }, { createdAt: 'asc' }] });
    const workerIds = bids.map((b) => b.workerId);
    const [users, profs] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: workerIds } }, select: { id: true, name: true, phone: true, tier: true } }),
      prisma.workerProfile.findMany({ where: { userId: { in: workerIds } } }),
    ]);
    const u = new Map(users.map((x) => [x.id, x]));
    const p = new Map(profs.map((x) => [x.userId, x]));
    res.json({
      job: { id: job.id, title: job.title, positions: job.positions, filledPositions: job.filledPositions },
      applicants: bids.map((b) => {
        const wp = p.get(b.workerId);
        return {
          id: b.id,
          workerId: b.workerId,
          name: u.get(b.workerId)?.name ?? '—',
          phone: u.get(b.workerId)?.phone ?? '',
          tier: u.get(b.workerId)?.tier ?? 0,
          subCity: wp?.subCity ?? '',
          jobsCompleted: wp?.jobsCompleted ?? 0,
          avgRating: wp?.avgRating ?? 0,
          skills: humanize(wp?.categories),
          message: b.message,
          stage: b.stage,
          interviewAt: b.interviewAt,
          interviewMode: b.interviewMode,
          onboarding: (() => { try { return JSON.parse(b.onboarding || '[]'); } catch { return []; } })(),
        };
      }),
    });
  }),
);

// Move an applicant through the pipeline + notify them (the "call/interview"
// step records a scheduled interview and pings the worker).
enterpriseRouter.post(
  '/applicants/:id/stage',
  authRequired,
  ah(async (req, res) => {
    const m = await requireMember(req.user!.sub);
    const body = z.object({
      stage: z.enum(ATS_STAGES),
      interviewAt: z.string().datetime().optional(),
      interviewMode: z.enum(['in_person', 'phone', 'video']).optional(),
      note: z.string().max(500).optional(),
    }).parse(req.body);

    const bid = await prisma.bid.findUnique({ where: { id: req.params.id }, include: { job: true } });
    if (!bid || bid.job.clientId !== m.enterprise.ownerId) throw new HttpError(404, 'Applicant not found in this enterprise.');

    const data: Record<string, unknown> = { stage: body.stage };
    if (body.stage === 'interview') {
      data.interviewAt = body.interviewAt ? new Date(body.interviewAt) : null;
      data.interviewMode = body.interviewMode ?? 'in_person';
      data.stageNote = body.note ?? '';
    }
    if (body.stage === 'offer' || body.stage === 'declined') data.stageNote = body.note ?? '';
    if ((body.stage === 'offer' || body.stage === 'hired') && (bid.onboarding === '[]' || !bid.onboarding)) {
      data.onboarding = JSON.stringify(DEFAULT_ONBOARDING);
    }
    if (body.stage === 'declined') data.status = 'declined';
    if (body.stage === 'hired') data.status = 'accepted';

    await prisma.bid.update({ where: { id: bid.id }, data });

    // Hiring fills a position (capped) and, for single-position roles, assigns the worker.
    if (body.stage === 'hired') {
      const filled = Math.min(bid.job.filledPositions + 1, bid.job.positions);
      await prisma.job.update({
        where: { id: bid.jobId },
        data: { filledPositions: filled, ...(bid.job.positions === 1 ? { workerId: bid.workerId, status: 'accepted' } : {}) },
      });
    }

    // Notify the worker of every transition that matters to them.
    const msg: Partial<Record<typeof body.stage, { title: string; body: string }>> = {
      shortlisted: { title: 'You were shortlisted', body: `${m.enterprise.name} shortlisted you for "${bid.job.title}".` },
      interview: { title: 'Interview scheduled', body: `${m.enterprise.name} invited you to an interview for "${bid.job.title}"${body.interviewAt ? ` on ${new Date(body.interviewAt).toLocaleString()}` : ''}.` },
      offer: { title: 'You received an offer', body: `${m.enterprise.name} offered you "${bid.job.title}".${body.note ? ' ' + body.note : ''}` },
      hired: { title: "You're hired 🎉", body: `${m.enterprise.name} hired you for "${bid.job.title}".` },
      declined: { title: 'Application update', body: `${m.enterprise.name} did not move forward with your application for "${bid.job.title}".` },
    };
    const n = msg[body.stage];
    if (n) await notify({ userId: bid.workerId, templateKey: 'system', title: n.title, body: n.body, type: 'system' }).catch(() => undefined);

    res.json({ ok: true, stage: body.stage });
  }),
);

// Toggle one onboarding checklist item for a hired/offered applicant.
enterpriseRouter.post(
  '/applicants/:id/onboarding',
  authRequired,
  ah(async (req, res) => {
    const m = await requireMember(req.user!.sub);
    const body = z.object({ key: z.string(), done: z.boolean() }).parse(req.body);
    const bid = await prisma.bid.findUnique({ where: { id: req.params.id }, include: { job: true } });
    if (!bid || bid.job.clientId !== m.enterprise.ownerId) throw new HttpError(404, 'Applicant not found in this enterprise.');
    let list: Array<{ key: string; label: string; done: boolean }> = [];
    try { list = JSON.parse(bid.onboarding || '[]'); } catch { list = []; }
    list = list.map((it) => (it.key === body.key ? { ...it, done: body.done } : it));
    await prisma.bid.update({ where: { id: bid.id }, data: { onboarding: JSON.stringify(list) } });
    res.json({ ok: true });
  }),
);

// Demo helper: populate a posting with sample applicants drawn from real workers
// so an enterprise can try the funnel before real applications arrive.
enterpriseRouter.post(
  '/jobs/:jobId/seed-applicants',
  authRequired,
  ah(async (req, res) => {
    const { job } = await enterpriseJob(req.user!.sub, req.params.jobId);
    const existing = await prisma.bid.findMany({ where: { jobId: job.id }, select: { workerId: true } });
    const have = new Set(existing.map((b) => b.workerId));
    const workers = await prisma.workerProfile.findMany({ take: 12, orderBy: { jobsCompleted: 'desc' } });
    const pick = workers.filter((w) => !have.has(w.userId)).slice(0, 6);
    if (pick.length === 0) return res.json({ ok: true, added: 0 });
    const base = (job.agreedPrice ?? Math.round(((job.priceBandLow || 0) + (job.priceBandHigh || 0)) / 2)) || 1000;
    const messages = [
      'Available immediately, 5+ years experience.',
      'Lives nearby, can start this week.',
      'Strong references from previous employers.',
      'Flexible on schedule, reliable.',
      'Verified ID and clean record.',
      'Experienced and detail-oriented.',
    ];
    await prisma.bid.createMany({
      data: pick.map((w, i) => ({
        jobId: job.id,
        workerId: w.userId,
        amount: base,
        message: messages[i % messages.length],
        stage: 'applied',
        status: 'pending',
      })),
    });
    res.status(201).json({ ok: true, added: pick.length });
  }),
);
