import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { distanceKm } from '../lib/geo.js';
import { ACCOUNTS, post, splitJob } from '../lib/ledger.js';
import { paymentAdapter } from '../lib/payments.js';
import { confirmEscrowFunding } from '../lib/escrow.js';
import { employmentType } from '../lib/employment.js';
import { centroid } from '../lib/geo.js';
import { matchScore } from '../lib/matching.js';
import { phoneFor } from '../lib/privacy.js';
import { wageFloor } from '../lib/wage.js';
import { canPost, incrementPost, canApply, incrementApp, MATCH_THRESHOLD } from '../lib/subscription.js';
import { snapshotScore, computeScore } from '../lib/score.js';
import { buildContract } from '../lib/contracts.js';
import { CATEGORIES } from '../lib/catalog.js';
import { notify } from '../lib/notifications.js';
import { pageParams, MAX_SCAN } from '../lib/paginate.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const jobsRouter = Router();

function serializeJob(j: any) {
  return {
    ...j,
    photos: typeof j.photos === 'string' ? JSON.parse(j.photos) : j.photos,
  };
}

/**
 * Attach the posting company's brand (logo + name + intro) to jobs whose client
 * has a business profile — shown as a company "ad" on listings. Batched by
 * distinct clientId so it stays a single query per page.
 */
async function attachCompany(jobs: any[], fullLogo = false) {
  const ids = [...new Set(jobs.map((j) => j.clientId).filter(Boolean))];
  if (!ids.length) return;
  const profs = await prisma.businessProfile.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, companyName: true, logoUrl: true, about: true, verified: true },
  });
  const byUser = new Map(profs.map((p) => [p.userId, p]));
  for (const j of jobs) {
    const p = byUser.get(j.clientId);
    if (p && (p.logoUrl || p.about)) {
      // Scale: never ship base64 logo blobs in LIST responses — only on detail.
      // (Production should store logos in object storage and serve CDN URLs.)
      const isDataUrl = p.logoUrl?.startsWith('data:');
      const logoUrl = !p.logoUrl ? null : fullLogo || !isDataUrl ? p.logoUrl : null;
      j.company = { name: p.companyName, logoUrl, hasLogo: !!p.logoUrl, about: p.about || '', verified: p.verified };
    }
  }
}

// Auto-close any open job whose deadline has passed (removed from listings).
async function sweepExpired() {
  await prisma.job.updateMany({
    where: { status: 'open', expiresAt: { lt: new Date() } },
    data: { status: 'expired' },
  });
}

async function priceBandFor(category: string, subCity: string) {
  const band = await prisma.priceBand.findUnique({
    where: { category_subCity: { category, subCity } },
  });
  return band ?? { low: 0, high: 0 };
}

// ── Post a job (client) ──────────────────────────────────────────────────────
jobsRouter.post(
  '/',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        category: z.string(),
        role: z.string().optional(),
        vertical: z.enum(['home', 'delivery', 'pro', 'care']).default('home'),
        title: z.string().min(2),
        description: z.string().default(''),
        photos: z.array(z.string()).default([]),
        subCity: z.string().default('Bole'),
        lat: z.number().optional(),
        lng: z.number().optional(),
        pricingMode: z.enum(['fixed', 'bid']).default('bid'),
        fixedPrice: z.number().optional(),
        scheduledFor: z.string().datetime().optional(),
        recurring: z.enum(['weekly', 'monthly']).optional(),
        femaleClientOnly: z.boolean().optional(),
        employmentType: z
          .enum(['gig', 'short_term', 'contract', 'permanent', 'group_hire'])
          .default('gig'),
        formality: z.enum(['formal', 'informal']).default('informal'),
        rateType: z.enum(['fixed', 'hourly', 'daily', 'weekly', 'monthly']).default('fixed'),
        positions: z.number().int().min(1).max(50).default(1),
        durationLabel: z.string().optional(),
        startsAt: z.string().datetime().optional(),
        endsAt: z.string().datetime().optional(),
        expiresAt: z.string().datetime().optional(),
        liveIn: z.boolean().default(false),
        daysOff: z.string().optional(),
        duties: z.array(z.string()).default([]),
        guarantorRequired: z.boolean().default(false),
        beneficiaryName: z.string().max(80).optional(),
        beneficiaryPhone: z.string().max(20).optional(),
      })
      .parse(req.body);

    // Employer subscription gate: active plan + ≤ 5 posts / month.
    const gate = await canPost(req.user!.sub);
    if (!gate.ok) {
      throw new HttpError(
        402,
        gate.reason === 'subscribe'
          ? 'An employer subscription is required to post jobs (ETB 100/month or 1000/year).'
          : `Monthly post limit reached (${5} jobs). Resets next month or upgrade.`,
      );
    }

    const et = employmentType(body.employmentType);
    const DOMESTIC = ['home_cleaning', 'care_domestic'];
    const isPermanentMaid = DOMESTIC.includes(body.category) && body.employmentType === 'permanent';

    // Permanent housemaid roles: max 4 per employer per year (low-volume, high-trust).
    if (isPermanentMaid) {
      const yearAgo = new Date(Date.now() - 365 * 86400000);
      const used = await prisma.job.count({
        where: { clientId: req.user!.sub, employmentType: 'permanent', category: { in: DOMESTIC }, createdAt: { gt: yearAgo } },
      });
      if (used >= 4) throw new HttpError(403, 'You can post up to 4 permanent housemaid roles per year.');
    }

    // Minimum wage on EVERY job (living-wage floor for time-based; min task for gigs).
    const liveIn = (!!body.role && body.role.includes('live_in')) || body.liveIn;
    const floor = wageFloor(body.rateType, liveIn);
    if (body.pricingMode === 'fixed' && body.fixedPrice != null && body.fixedPrice < floor) {
      throw new HttpError(
        400,
        `Below the minimum of ETB ${floor.toLocaleString()} ${body.rateType === 'fixed' ? 'per task' : body.rateType}. Fair pay protects workers from exploitation.`,
      );
    }
    // A guarantor (ዋስ) is mandatory for permanent housemaids.
    if (isPermanentMaid) body.guarantorRequired = true;
    const band = await priceBandFor(body.category, body.subCity);
    const point =
      body.lat !== undefined && body.lng !== undefined
        ? { lat: body.lat, lng: body.lng }
        : centroid(body.subCity);
    const job = await prisma.job.create({
      data: {
        clientId: req.user!.sub,
        category: body.category,
        role: body.role ?? null,
        vertical: body.vertical,
        title: body.title,
        description: body.description,
        photos: JSON.stringify(body.photos),
        subCity: body.subCity,
        lat: point.lat,
        lng: point.lng,
        pricingMode: body.pricingMode,
        priceBandLow: band.low,
        priceBandHigh: band.high,
        agreedPrice: body.pricingMode === 'fixed' ? body.fixedPrice ?? null : null,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        recurring: body.recurring ?? null,
        employmentType: body.employmentType,
        formality: body.formality,
        rateType: body.rateType,
        positions: body.positions,
        durationLabel: body.durationLabel ?? null,
        requiresContract: et.requiresContract,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        // every post has a deadline; default 14 days, then auto-closed
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 14 * 86400000),
        liveIn: body.liveIn,
        daysOff: body.daysOff ?? null,
        duties: JSON.stringify(body.duties),
        guarantorRequired: body.guarantorRequired,
        beneficiaryName: body.beneficiaryName ?? null,
        beneficiaryPhone: body.beneficiaryPhone ?? null,
      },
    });
    await incrementPost(req.user!.sub);
    res.status(201).json(serializeJob(job));
  }),
);

// ── Worker job feed (geo + category matched, open only) ──────────────────────
jobsRouter.get(
  '/feed',
  authRequired,
  ah(async (req, res) => {
    await sweepExpired();
    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user!.sub } });
    const cats: string[] = profile ? JSON.parse(profile.categories) : [];
    const roles: string[] = profile ? JSON.parse(profile.roles ?? '[]') : [];
    const { take, skip } = pageParams(req.query);
    // Bound the candidate scan; ranking/gating happen in-memory on this window.
    const open = await prisma.job.findMany({
      where: { status: 'open' },
      include: { client: { select: { name: true } }, _count: { select: { bids: true } } },
      orderBy: { createdAt: 'desc' },
      take: MAX_SCAN,
    });

    const origin = profile ? { lat: profile.lat, lng: profile.lng } : null;
    const radius = profile?.serviceRadiusKm ?? 15;

    const feed = open
      .map((j) => {
        const dist = origin ? Number(distanceKm(origin, { lat: j.lat, lng: j.lng }).toFixed(1)) : null;
        const recencyDays = (Date.now() - new Date(j.createdAt).getTime()) / 86400000;
        return {
          ...serializeJob(j),
          clientName: j.client.name,
          bidCount: j._count.bids,
          distanceKm: dist,
          matchScore: matchScore(
            {
              distanceKm: dist,
              categoryMatch: cats.includes(j.category),
              roleMatch: !!j.role && roles.includes(j.role),
              rating: 0,
              score: 600,
              verified: true,
              recencyDays,
            },
            radius,
          ),
        };
      })
      .filter((j) => (origin ? (j.distanceKm ?? 0) <= radius : true))
      // Hard gate: only show jobs that are an ≥80% skill match.
      .filter((j) => j.matchScore >= MATCH_THRESHOLD)
      .sort((a, b) => b.matchScore - a.matchScore);

    const page = feed.slice(skip, skip + take);
    await attachCompany(page);
    res.json(page);
  }),
);

// ── My jobs (as client or worker) ────────────────────────────────────────────
jobsRouter.get(
  '/mine',
  authRequired,
  ah(async (req, res) => {
    await sweepExpired();
    const role = z.object({ as: z.enum(['client', 'worker']).default('client') }).parse(req.query).as;
    const { take, skip } = pageParams(req.query);
    const where = role === 'worker' ? { workerId: req.user!.sub } : { clientId: req.user!.sub };
    const jobs = await prisma.job.findMany({
      where,
      include: {
        client: { select: { name: true } },
        worker: { select: { name: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
    const mine = jobs.map((j) => ({ ...serializeJob(j), clientName: j.client.name, workerName: j.worker?.name, bidCount: j._count.bids }));
    await attachCompany(mine);
    res.json(mine);
  }),
);

// ── Job detail ───────────────────────────────────────────────────────────────
jobsRouter.get(
  '/:id',
  authRequired,
  ah(async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        worker: { select: { id: true, name: true, phone: true } },
        bids: { include: { worker: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
        messages: { include: { sender: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!job) throw new HttpError(404, 'Job not found');

    // Contacts are private. A phone number is revealed ONLY once the job is
    // accepted (worker assigned) AND the agreement/contract is signed — and only
    // between those two parties. Owners always see their own; admins always see.
    const viewer = req.user!.sub;
    const isAdmin = req.user!.roles.admin;
    const viewerIsClient = viewer === job.clientId;
    const signedContract = job.workerId
      ? await prisma.contract.findFirst({ where: { jobId: job.id, status: { in: ['signed', 'active'] } }, select: { id: true } })
      : null;
    // The engaged-and-signed gate: hired worker + signed agreement.
    const unlocked = !!job.workerId && !!signedContract && (viewerIsClient || viewer === job.workerId);
    const out: any = serializeJob(job);
    out.contactsUnlocked = unlocked || isAdmin;
    out.contactsLockedReason = out.contactsUnlocked ? null : !job.workerId ? 'Accept a worker first' : !signedContract ? 'Sign the agreement to reveal contacts' : 'Hidden';
    // Employer's phone → only to the assigned worker once the agreement is signed.
    if (out.client) out.client = { ...out.client, phone: phoneFor(viewer, job.clientId, out.client.phone, { isAdmin, engaged: unlocked }) };
    // Assigned worker's phone → only to the employer once the agreement is signed.
    if (out.worker && job.workerId) out.worker = { ...out.worker, phone: phoneFor(viewer, job.workerId, out.worker.phone, { isAdmin, engaged: unlocked }) };
    // Bidders' phones stay masked for everyone but the bidder themselves / admin.
    if (Array.isArray(out.bids)) {
      out.bids = out.bids.map((b: any) => ({
        ...b,
        worker: b.worker ? { ...b.worker, phone: phoneFor(viewer, b.worker.id, b.worker.phone, { isAdmin, engaged: false }) } : b.worker,
      }));
    }

    // taxi-style ETA from the worker's live position to the job
    if (job.liveLat != null && job.liveLng != null && ['enroute', 'started'].includes(job.status)) {
      const km = distanceKm({ lat: job.liveLat, lng: job.liveLng }, { lat: job.lat, lng: job.lng });
      out.tracking = {
        liveLat: job.liveLat,
        liveLng: job.liveLng,
        distanceKm: Number(km.toFixed(1)),
        etaMin: Math.max(1, Math.round((km / 18) * 60)), // ~18 km/h urban
        updatedAt: job.liveAt,
      };
    }
    // company brand ("ad") if the poster is a business (full logo on detail only)
    await attachCompany([out], true);
    res.json(out);
  }),
);

// ── Place a bid (worker) ─────────────────────────────────────────────────────
jobsRouter.post(
  '/:id/bids',
  authRequired,
  ah(async (req, res) => {
    const { amount, message } = z
      .object({ amount: z.number().int().positive(), message: z.string().default('') })
      .parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.status !== 'open') throw new HttpError(400, 'Job is no longer open');

    const liveIn = (!!job.role && job.role.includes('live_in')) || job.liveIn;
    const floor = wageFloor(job.rateType, liveIn);
    if (amount < floor) {
      throw new HttpError(400, `Below the minimum of ETB ${floor.toLocaleString()} ${job.rateType === 'fixed' ? 'per task' : job.rateType}.`);
    }

    // Guarantor (ዋስ) is mandatory to apply for guarantor-required roles (housemaids).
    if (job.guarantorRequired) {
      const g = await prisma.guarantor.count({ where: { workerId: req.user!.sub } });
      if (g === 0) {
        throw new HttpError(403, 'This role requires a guarantor (ዋስ). Add a guarantor in your profile before applying.');
      }
    }

    // Worker monthly application quota (5 / month).
    const quota = await canApply(req.user!.sub);
    if (!quota.ok) throw new HttpError(429, `You've used your ${5} applications this month. Quota resets next month.`);

    // Hard skill-match gate: must be ≥80% relevant to apply.
    const m = await workerJobMatch(req.user!.sub, job);
    if (m < MATCH_THRESHOLD) {
      throw new HttpError(403, `This job isn't a strong enough skill match (${m}%). You can apply only to ≥${MATCH_THRESHOLD}% matches — add the right skills/specializations to your profile.`);
    }

    await enforceTierCap(req.user!.sub);

    const bid = await prisma.bid.create({
      data: { jobId: job.id, workerId: req.user!.sub, amount, message },
    });
    await incrementApp(req.user!.sub);
    await notify({ userId: job.clientId, templateKey: 'job.new_bid', link: `/app/job/${job.id}` });
    res.status(201).json(bid);
  }),
);

// ── Accept a bid (client) → assigns worker, sets agreed price ────────────────
jobsRouter.post(
  '/:id/accept-bid',
  authRequired,
  ah(async (req, res) => {
    const { bidId } = z.object({ bidId: z.string() }).parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.clientId !== req.user!.sub) throw new HttpError(403, 'Only the client can accept bids');
    if (job.status !== 'open') throw new HttpError(400, 'Job is no longer open');
    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid || bid.jobId !== job.id) throw new HttpError(404, 'Bid not found');

    await enforceTierCap(bid.workerId);

    // Group hire: fill positions one accepted bid at a time; the job stays open
    // until all positions are filled. Single-position jobs assign immediately.
    const isGroup = job.employmentType === 'group_hire' && job.positions > 1;
    const filled = job.filledPositions + 1;
    const fullyStaffed = filled >= job.positions;

    const ops: any[] = [
      prisma.bid.update({ where: { id: bidId }, data: { status: 'accepted' } }),
      prisma.job.update({
        where: { id: job.id },
        data: {
          // primary worker = first accepted; escrow/lifecycle run on the job total
          workerId: job.workerId ?? bid.workerId,
          agreedPrice: job.agreedPrice ?? bid.amount,
          filledPositions: filled,
          status: isGroup && !fullyStaffed ? 'open' : 'accepted',
        },
      }),
    ];
    // only decline the rest once the roster is full (or for single-hire jobs)
    if (!isGroup || fullyStaffed) {
      ops.push(
        prisma.bid.updateMany({
          where: { jobId: job.id, status: 'pending', id: { not: bidId } },
          data: { status: 'declined' },
        }),
      );
    }
    const results = await prisma.$transaction(ops);
    // Engagement: the hired worker goes "busy" and stays off new matching until finalized.
    await prisma.workerProfile.updateMany({ where: { userId: bid.workerId }, data: { availability: 'busy' } });
    await notify({ userId: bid.workerId, templateKey: 'job.assigned', link: `/app/job/${job.id}` });

    // Every hire is contracted on the app: auto-generate the consensus agreement
    // (the binding contract is still signed in person). Skips if one exists or
    // the group roster isn't full yet.
    if (!isGroup || fullyStaffed) {
      const exists = await prisma.contract.findFirst({ where: { jobId: job.id } });
      if (!exists) {
        const [client, worker] = await Promise.all([
          prisma.user.findUnique({ where: { id: job.clientId }, select: { name: true } }),
          prisma.user.findUnique({ where: { id: bid.workerId }, select: { name: true } }),
        ]);
        const { title, body, termsJson } = buildContract(job.employmentType, {
          clientName: client?.name ?? 'Client',
          workerName: worker?.name ?? 'Worker',
          amount: job.agreedPrice ?? bid.amount,
          rateType: job.rateType,
          durationLabel: job.durationLabel,
          scope: job.description ? [job.description] : [],
          category: CATEGORIES.find((c) => c.key === job.category)?.en ?? job.category,
          subCity: job.subCity,
        });
        const contract = await prisma.contract.create({
          data: { jobId: job.id, clientId: job.clientId, workerId: bid.workerId, type: job.employmentType, title, bodyMarkdown: body, termsJson, status: 'sent' },
        });
        await notify({ userId: bid.workerId, templateKey: 'contract.to_sign', link: `/app/contract/${contract.id}` });
        await notify({ userId: job.clientId, templateKey: 'contract.to_sign', link: `/app/contract/${contract.id}` });
      }
    }
    res.json(serializeJob(results[1]));
  }),
);

// ── Fund escrow (client) — simulates aggregator webhook confirmation ─────────
jobsRouter.post(
  '/:id/fund',
  authRequired,
  ah(async (req, res) => {
    const { method } = z
      .object({ method: z.enum(['telebirr', 'cbe_birr', 'card']).default('telebirr') })
      .parse(req.body ?? {});
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.clientId !== req.user!.sub) throw new HttpError(403, 'Only the client can fund');
    if (!job.agreedPrice) throw new HttpError(400, 'No agreed price yet');
    if (job.escrowState !== 'none') throw new HttpError(400, 'Already funded');

    // Route through the configured aggregator adapter (spec B3.4).
    const adapter = paymentAdapter();
    const init = await adapter.initiate({
      jobId: job.id,
      amount: job.agreedPrice,
      method,
      reference: `${job.id}_${Date.now()}`,
    });
    if (init.status !== 'confirmed') {
      // real aggregators confirm via webhook; return the checkout URL to the client
      return res.json({ ok: true, escrowState: 'pending', checkoutUrl: init.checkoutUrl });
    }
    await confirmEscrowFunding(job.id, init.externalRef, method);
    if (job.workerId) await notify({ userId: job.workerId, templateKey: 'job.funded', link: `/app/job/${job.id}` });
    res.json({ ok: true, escrowState: 'funded', externalRef: init.externalRef });
  }),
);

// ── Lifecycle transitions (worker drives execution) ──────────────────────────
const TRANSITIONS: Record<string, { to: string; role: 'worker' | 'client' }> = {
  enroute: { to: 'enroute', role: 'worker' },
  start: { to: 'started', role: 'worker' },
  complete: { to: 'completed', role: 'worker' },
};

jobsRouter.post(
  '/:id/:action',
  authRequired,
  ah(async (req, res, next) => {
    const action = req.params.action;
    if (!(action in TRANSITIONS)) return next(); // fall through to other handlers
    const t = TRANSITIONS[action];
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (t.role === 'worker' && job.workerId !== req.user!.sub)
      throw new HttpError(403, 'Only the assigned worker can do this');

    const body = z
      .object({ lat: z.number().optional(), lng: z.number().optional(), photoProofRef: z.string().optional() })
      .parse(req.body ?? {});

    const data: Record<string, unknown> = { status: t.to };
    if (action === 'enroute') {
      data.liveLat = body.lat ?? null;
      data.liveLng = body.lng ?? null;
      data.liveAt = new Date();
    }
    if (action === 'start') {
      data.startedAt = new Date();
      data.startLat = body.lat ?? null;
      data.startLng = body.lng ?? null;
    }
    if (action === 'complete') {
      data.completedAt = new Date();
      data.photoProofRef = body.photoProofRef ?? null;
    }
    const updated = await prisma.job.update({ where: { id: job.id }, data });
    if (action === 'complete') {
      await notify({ userId: job.clientId, templateKey: 'job.completed', link: `/app/job/${job.id}` });
      await notify({
        userId: job.clientId,
        templateKey: 'reminder.confirm',
        link: `/app/job/${job.id}`,
        dueAt: new Date(Date.now() + 24 * 3600 * 1000),
        persist: true,
        channels: [],
      });
    }
    res.json(serializeJob(updated));
  }),
);

// ── Live location ping (worker, taxi-style tracking) ─────────────────────────
jobsRouter.post(
  '/:id/track',
  authRequired,
  ah(async (req, res) => {
    const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.workerId !== req.user!.sub) throw new HttpError(403, 'Only the assigned worker can share location');
    await prisma.job.update({ where: { id: job.id }, data: { liveLat: lat, liveLng: lng, liveAt: new Date() } });
    res.json({ ok: true });
  }),
);

// ── Confirm completion (client) → release escrow split, update score ─────────
jobsRouter.post(
  '/:id/confirm',
  authRequired,
  ah(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.clientId !== req.user!.sub) throw new HttpError(403, 'Only the client can confirm');
    if (job.status !== 'completed') throw new HttpError(400, 'Job is not awaiting confirmation');
    if (!job.agreedPrice || !job.workerId) throw new HttpError(400, 'Job is missing price or worker');

    const client = await prisma.user.findUnique({ where: { id: job.clientId }, select: { accountType: true } });
    const split = splitJob(job.agreedPrice, job.vertical, client?.accountType);
    await prisma.$transaction(async (tx) => {
      await post(
        [
          {
            debitAccount: ACCOUNTS.CLIENT_ESCROW,
            creditAccount: ACCOUNTS.WORKER_PAYABLE,
            amount: split.workerNet,
            jobId: job.id,
            ownerId: job.workerId!,
            memo: 'Worker net on confirmed job',
          },
          {
            debitAccount: ACCOUNTS.CLIENT_ESCROW,
            creditAccount: ACCOUNTS.PLATFORM_COMMISSION,
            amount: split.commission,
            jobId: job.id,
            memo: 'Platform commission',
          },
          {
            debitAccount: ACCOUNTS.CLIENT_ESCROW,
            creditAccount: ACCOUNTS.GUARANTEE_RESERVE,
            amount: split.reserve,
            jobId: job.id,
            memo: 'Guarantee reserve (1%)',
          },
        ],
        tx,
      );
      await tx.job.update({
        where: { id: job.id },
        data: { status: 'confirmed', escrowState: 'released', confirmedAt: new Date() },
      });
      // update worker rolling stats
      const completed = await tx.job.count({ where: { workerId: job.workerId!, status: 'confirmed' } });
      const assigned = await tx.job.count({
        where: { workerId: job.workerId!, status: { in: ['confirmed', 'cancelled'] } },
      });
      await tx.workerProfile.update({
        where: { userId: job.workerId! },
        data: {
          jobsCompleted: completed,
          completionRate: assigned > 0 ? completed / assigned : 1,
        },
      });
    });

    const score = await snapshotScore(job.workerId);
    await notify({ userId: job.workerId, templateKey: 'job.confirmed_paid', payload: { amount: split.workerNet } });
    res.json({ ok: true, escrowState: 'released', split, score });
  }),
);

// ── Direct payment (employer marks they paid the worker directly) ────────────
// Serategna NEVER holds the money. This records that the off-platform payment
// (Telebirr/CBE Birr/cash) was made, so the worker can finalize and both build
// a verified history.
jobsRouter.post(
  '/:id/mark-paid',
  authRequired,
  ah(async (req, res) => {
    const { method, txRef } = z
      .object({ method: z.enum(['telebirr', 'cbe_birr', 'cash', 'bank']).default('telebirr'), txRef: z.string().max(80).optional() })
      .parse(req.body ?? {});
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.clientId !== req.user!.sub) throw new HttpError(403, 'Only the employer can mark payment');
    if (job.status !== 'completed') throw new HttpError(400, 'Job is not awaiting payment');
    if (!job.agreedPrice || !job.workerId) throw new HttpError(400, 'Missing price or worker');

    // notional record only (nets to zero; no funds held by Serategna)
    await post([
      { debitAccount: ACCOUNTS.DIRECT_EMPLOYER, creditAccount: ACCOUNTS.DIRECT_WORKER, amount: job.agreedPrice, jobId: job.id, ownerId: job.workerId, memo: `Direct payment via ${method}${txRef ? ` · ref ${txRef}` : ''}` },
    ]);
    // capture the transaction reference as tamper-evident wage proof
    await prisma.job.update({ where: { id: job.id }, data: { status: 'paid', paidAt: new Date(), paymentRef: txRef ?? `${method}` } });
    await notify({ userId: job.workerId, templateKey: 'job.paid', title: 'Payment sent', body: `The employer marked your payment (${method}). Finalize when received.`, type: 'payout', link: `/app/job/${job.id}` });
    res.json({ ok: true, status: 'paid', method });
  }),
);

// ── Finalize (worker confirms received payment → frees them for new jobs) ────
jobsRouter.post(
  '/:id/finalize',
  authRequired,
  ah(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.workerId !== req.user!.sub) throw new HttpError(403, 'Only the worker can finalize');
    if (job.status !== 'paid') throw new HttpError(400, 'Job is not awaiting finalization');

    const amount = job.agreedPrice ?? 0;
    await prisma.$transaction(async (tx) => {
      // The task is done and the EMPLOYEE has confirmed: the agreed birr is now
      // treated as credited. Mark it confirmed (which immediately recognises it
      // in the worker's verified income sources) and stamp paidAt.
      await tx.job.update({ where: { id: job.id }, data: { status: 'confirmed', confirmedAt: new Date(), paidAt: job.paidAt ?? new Date(), escrowState: 'released' } });
      // worker is available again for new jobs
      await tx.workerProfile.updateMany({ where: { userId: job.workerId! }, data: { availability: 'available' } });
      const completed = await tx.job.count({ where: { workerId: job.workerId!, status: 'confirmed' } });
      const assigned = await tx.job.count({ where: { workerId: job.workerId!, status: { in: ['confirmed', 'cancelled'] } } });
      await tx.workerProfile.update({
        where: { userId: job.workerId! },
        data: { jobsCompleted: completed, completionRate: assigned > 0 ? completed / assigned : 1 },
      });
      // Iqub-style auto-savings: set aside the configured % of this payment.
      const goal = await tx.savingsGoal.findUnique({ where: { userId: job.workerId! } });
      if (goal && amount > 0) {
        const add = Math.round((amount * goal.ratePct) / 100);
        await tx.savingsGoal.update({ where: { userId: job.workerId! }, data: { savedAmount: { increment: add } } });
      }
    });
    // Recompute score/income now that this job counts — verified income updates immediately.
    const score = await snapshotScore(job.workerId);
    await notify({ userId: job.workerId, templateKey: 'job.confirmed_paid', title: 'Income credited', body: `ETB ${amount.toLocaleString()} added to your verified income. New balance: ETB ${(score.totalEarned ?? 0).toLocaleString()}.`, type: 'payout', link: '/app/wallet' });
    await notify({ userId: job.clientId, templateKey: 'job.finalized', title: 'Job finalized', body: 'The worker confirmed payment. Leave a rating.', type: 'job', link: `/app/job/${job.id}` });
    res.json({ ok: true, status: 'confirmed', creditedAmount: amount, verifiedIncome: score.totalEarned ?? 0, score });
  }),
);

// ── Job message thread ───────────────────────────────────────────────────────
jobsRouter.post(
  '/:id/messages',
  authRequired,
  ah(async (req, res) => {
    const { body } = z.object({ body: z.string().min(1) }).parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, 'Job not found');
    const msg = await prisma.message.create({
      data: { jobId: job.id, senderId: req.user!.sub, body },
      include: { sender: { select: { name: true } } },
    });
    res.status(201).json(msg);
  }),
);

// Compute a worker's skill-match (0–100) for a specific job (80% gate).
async function workerJobMatch(workerId: string, job: any): Promise<number> {
  const profile = await prisma.workerProfile.findUnique({ where: { userId: workerId } });
  if (!profile) return 0;
  const cats = JSON.parse(profile.categories) as string[];
  const roles = JSON.parse(profile.roles ?? '[]') as string[];
  const [s, user] = await Promise.all([
    computeScore(workerId),
    prisma.user.findUnique({ where: { id: workerId }, select: { tier: true } }),
  ]);
  const dist = distanceKm({ lat: profile.lat, lng: profile.lng }, { lat: job.lat, lng: job.lng });
  return matchScore(
    {
      distanceKm: dist,
      categoryMatch: cats.includes(job.category),
      roleMatch: !!job.role && roles.includes(job.role),
      rating: profile.avgRating,
      score: s.score,
      verified: (user?.tier ?? 0) >= 1,
      available: profile.availability === 'available',
    },
    profile.serviceRadiusKm,
  );
}

// Tier-0 cap enforcement (spec B2.2)
async function enforceTierCap(workerId: string) {
  const user = await prisma.user.findUnique({ where: { id: workerId } });
  if (!user || user.tier >= 1) return;
  const jobs = await prisma.job.findMany({
    where: { workerId, status: { in: ['accepted', 'enroute', 'started', 'completed', 'confirmed'] } },
    select: { agreedPrice: true },
  });
  const gross = jobs.reduce((a, j) => a + (j.agreedPrice ?? 0), 0);
  if (jobs.length >= config.economics.tier0JobCap || gross >= config.economics.tier0GrossCap) {
    throw new HttpError(
      403,
      `Tier-0 limit reached (${config.economics.tier0JobCap} jobs / ETB ${config.economics.tier0GrossCap}). Verify with Fayda to keep working and unlock withdrawals.`,
    );
  }
}
