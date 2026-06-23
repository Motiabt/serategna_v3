import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ACCOUNTS, balance, post } from '../lib/ledger.js';
import { snapshotScore } from '../lib/score.js';
import { ah, authRequired, adminRequired, HttpError } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';

export const adminRouter = Router();
adminRouter.use(authRequired, adminRequired);

// ── KPI dashboard (spec B5) ──────────────────────────────────────────────────
adminRouter.get(
  '/kpis',
  ah(async (_req, res) => {
    const [workers, tier1, jobsCompleted, disputes, totalJobs, sosActive, pendingVerifs] =
      await Promise.all([
        prisma.workerProfile.count(),
        prisma.user.count({ where: { isWorker: true, tier: { gte: 1 } } }),
        prisma.job.count({ where: { status: 'confirmed' } }),
        prisma.dispute.count(),
        prisma.job.count(),
        prisma.sosEvent.count({ where: { status: 'active' } }),
        prisma.verificationRequest.count({ where: { status: 'pending' } }),
      ]);

    // Revenue = employer subscriptions (Serategna takes no commission; holds no funds).
    const subs = await prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: 'active' },
      _count: { _all: true },
    });
    const planPrice: Record<string, number> = { monthly: 100, annual: 1000 };
    const subscriptionRevenue = subs.reduce((a, s) => a + (planPrice[s.plan] ?? 0) * s._count._all, 0);
    const activeSubs = subs.reduce((a, s) => a + s._count._all, 0);

    res.json({
      activeWorkers: workers,
      tier1Workers: tier1,
      jobsCompleted,
      totalJobs,
      disputeRate: totalJobs > 0 ? Number((disputes / totalJobs).toFixed(3)) : 0,
      sosActive,
      pendingVerifications: pendingVerifs,
      revenue: subscriptionRevenue,
      activeSubscriptions: activeSubs,
      fundsHeld: 0,
    });
  }),
);

// ── Business model: unit economics + Phase-1 exit criteria (Business Model Pt 3) ─
adminRouter.get(
  '/business',
  ah(async (_req, res) => {
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400000);
    // Aggregate in the DB instead of loading every confirmed job into memory —
    // groupBy returns one row per (client, worker) pair, not per job, so this
    // scales to the 100k-job target.
    const [agg, pairsGrouped, recentConfirmed, activeTier1, commission, reserve, disputes, totalJobs] =
      await Promise.all([
        prisma.job.aggregate({ where: { status: 'confirmed' }, _sum: { agreedPrice: true }, _count: { _all: true } }),
        prisma.job.groupBy({ by: ['clientId', 'workerId'], where: { status: 'confirmed' }, _count: { _all: true } }),
        prisma.job.count({ where: { status: 'confirmed', confirmedAt: { gte: fourWeeksAgo } } }),
        prisma.user.count({ where: { isWorker: true, tier: { gte: 1 } } }),
        balance(ACCOUNTS.PLATFORM_COMMISSION),
        balance(ACCOUNTS.GUARANTEE_RESERVE),
        prisma.dispute.count(),
        prisma.job.count(),
      ]);

    const grossValue = agg._sum.agreedPrice ?? 0;
    const jobsDone = agg._count._all;
    const avgJobValue = jobsDone ? Math.round(grossValue / jobsDone) : 0;
    const blendedTakeRate = grossValue ? (commission + reserve) / grossValue : 0;
    const netCommissionPerJob = jobsDone ? Math.round(commission / jobsDone) : 0;
    const jobsPerWorkerWeek = activeTier1 ? recentConfirmed / activeTier1 / 4 : 0;

    // repeat-pair on-platform share (leakage inverse) — counted from grouped pairs
    const repeatShare = pairsGrouped.length
      ? pairsGrouped.filter((p) => p._count._all > 1).length / pairsGrouped.length
      : 0;

    const exitCriteria = [
      { label: 'Verified paid jobs / worker / week', target: 2.5, current: Number(jobsPerWorkerWeek.toFixed(2)), unit: '' },
      { label: 'Active Tier-1 workers', target: 3000, current: activeTier1, unit: '' },
      { label: 'Cumulative completed jobs', target: 100000, current: jobsDone, unit: '' },
      { label: 'Repeat-pair on-platform share', target: 0.6, current: Number(repeatShare.toFixed(2)), unit: '%' },
      { label: 'Dispute rate', target: 0.03, current: Number((totalJobs ? disputes / totalJobs : 0).toFixed(3)), unit: '%', lowerIsBetter: true },
    ].map((c) => ({ ...c, met: c.lowerIsBetter ? c.current <= c.target : c.current >= c.target }));

    res.json({
      unitEconomics: {
        avgJobValue,
        blendedTakeRate: Number(blendedTakeRate.toFixed(3)),
        grossTakePerJob: jobsDone ? Math.round((commission + reserve) / jobsDone) : 0,
        guaranteeReservePerJob: jobsDone ? Math.round(reserve / jobsDone) : 0,
        netCommissionPerJob,
        revenueToDate: commission,
        grossMarketplaceValue: grossValue,
      },
      exitCriteria,
      context: {
        addressableWorkers: '4.5M+',
        breakEvenMonth: '18–20',
        cumulative36mRevenue: 'ETB 18–22M',
        phase1TargetRevenue: 'ETB 1.7–2.1M',
      },
      revenueStreams: [
        { name: 'Marketplace take-rate', phase: 1, live: true, detail: '7% home · 10% delivery · 5% business' },
        { name: 'Earned-Wage Access fee', phase: 2, live: false, detail: 'ETB 15 / advance' },
        { name: 'Score licensing / origination', phase: 2, live: false, detail: 'ETB 150–300 / loan' },
        { name: 'Equb circle management', phase: 3, live: false, detail: 'ETB 20 / member / month' },
        { name: 'Insurance distribution', phase: 3, live: false, detail: '~15% of premium' },
        { name: 'Business account take-rate', phase: 3, live: true, detail: '5% (active for business accounts)' },
        { name: 'Diaspora service fee', phase: 3, live: false, detail: 'ETB 50 / booking' },
      ],
    });
  }),
);

// ── Verification queue ───────────────────────────────────────────────────────
adminRouter.get(
  '/verifications',
  ah(async (_req, res) => {
    const queue = await prisma.verificationRequest.findMany({
      where: { status: 'pending' },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    res.json(queue);
  }),
);

adminRouter.post(
  '/verifications/:id/decide',
  ah(async (req, res) => {
    const { decision } = z.object({ decision: z.enum(['approved', 'rejected']) }).parse(req.body);
    const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new HttpError(404, 'Request not found');

    await prisma.verificationRequest.update({
      where: { id: request.id },
      data: { status: decision, reviewerId: req.user!.sub, decision, decidedAt: new Date() },
    });
    await prisma.user.update({
      where: { id: request.userId },
      data: {
        faydaStatus: decision === 'approved' ? 'verified' : 'rejected',
        tier: decision === 'approved' ? 1 : 0,
      },
    });
    // Tier-1 unlocks Score accrual — snapshot immediately (retro-credit, B2.2)
    if (decision === 'approved') await snapshotScore(request.userId);
    await audit(req, 'verification.decide', request.userId, { decision });
    res.json({ ok: true, decision });
  }),
);

// ── Certification verification queue ─────────────────────────────────────────
adminRouter.get(
  '/certifications',
  ah(async (_req, res) => {
    const queue = await prisma.certification.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    const withUser = await Promise.all(
      queue.map(async (c) => {
        const u = await prisma.user.findUnique({ where: { id: c.userId }, select: { name: true, phone: true } });
        return { ...c, user: u };
      }),
    );
    res.json(withUser);
  }),
);

adminRouter.post(
  '/certifications/:id/decide',
  ah(async (req, res) => {
    const { decision } = z.object({ decision: z.enum(['verified', 'rejected']) }).parse(req.body);
    const cert = await prisma.certification.findUnique({ where: { id: req.params.id } });
    if (!cert) throw new HttpError(404, 'Certification not found');
    await prisma.certification.update({
      where: { id: cert.id },
      data: { status: decision, reviewerId: req.user!.sub, decidedAt: new Date() },
    });
    if (decision === 'verified') await snapshotScore(cert.userId).catch(() => undefined);
    await audit(req, 'certification.decide', cert.id, { decision });
    res.json({ ok: true, decision });
  }),
);

// ── Disputes desk ────────────────────────────────────────────────────────────
adminRouter.get(
  '/disputes',
  ah(async (_req, res) => {
    const disputes = await prisma.dispute.findMany({
      where: { status: { in: ['open', 'mediating'] } },
      include: { job: true, opener: { select: { name: true } } },
      orderBy: { openedAt: 'asc' },
      take: 200,
    });
    res.json(disputes);
  }),
);

adminRouter.post(
  '/disputes/:id/resolve',
  ah(async (req, res) => {
    const { outcome, note } = z
      .object({ outcome: z.enum(['refund', 'release', 'reject']), note: z.string().default('') })
      .parse(req.body);
    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id }, include: { job: true } });
    if (!dispute) throw new HttpError(404, 'Dispute not found');
    const job = dispute.job;

    await prisma.$transaction(async (tx) => {
      if (outcome === 'refund' && job.agreedPrice && job.escrowState === 'held') {
        await post(
          [
            {
              debitAccount: ACCOUNTS.CLIENT_ESCROW,
              creditAccount: ACCOUNTS.BANK_ESCROW,
              amount: job.agreedPrice,
              jobId: job.id,
              ownerId: job.clientId,
              memo: 'Refund on upheld dispute',
            },
          ],
          tx,
        );
        await tx.job.update({ where: { id: job.id }, data: { escrowState: 'refunded', status: 'cancelled' } });
      }
      if (outcome === 'release' && job.agreedPrice && job.workerId && job.escrowState === 'held') {
        await tx.job.update({ where: { id: job.id }, data: { status: 'completed' } });
      }
      await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: outcome === 'refund' ? 'resolved_refund' : outcome === 'release' ? 'resolved_release' : 'rejected',
          mediatorId: req.user!.sub,
          resolution: note,
          resolvedAt: new Date(),
        },
      });
    });
    await audit(req, 'dispute.resolve', dispute.id, { outcome });
    res.json({ ok: true, outcome });
  }),
);

// ── SoS desk ─────────────────────────────────────────────────────────────────
adminRouter.get(
  '/sos',
  ah(async (_req, res) => {
    const events = await prisma.sosEvent.findMany({
      where: { status: { in: ['active', 'acknowledged'] } },
      include: { user: { select: { name: true, phone: true } }, job: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(
      events.map((e) => ({ ...e, gpsTrail: JSON.parse(e.gpsTrail), alertChain: JSON.parse(e.alertChain) })),
    );
  }),
);

adminRouter.post(
  '/sos/:id/resolve',
  ah(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['acknowledged', 'resolved', 'false_alarm']) })
      .parse(req.body);
    await prisma.sosEvent.update({
      where: { id: req.params.id },
      data: { status, resolvedAt: new Date() },
    });
    await audit(req, 'sos.resolve', req.params.id, { status });
    res.json({ ok: true });
  }),
);

// ── Leads (enterprise inquiries / callbacks) ─────────────────────────────────
adminRouter.get(
  '/leads',
  ah(async (_req, res) => {
    res.json(await prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }));
  }),
);

// ── DPO data-subject access (Proclamation 1321/2024) ─────────────────────────
// Lawful access ONLY: super-admin, audited, for a data-subject access/erasure
// request. Returns the data Serategna holds for a person (no other user's data).
adminRouter.get(
  '/data-subject',
  ah(async (req, res) => {
    const q = z.object({ query: z.string().min(3) }).parse(req.query);
    const user = await prisma.user.findFirst({
      where: { OR: [{ phone: { contains: q.query } }, { id: q.query }, { name: { contains: q.query } }] },
    });
    if (!user) throw new HttpError(404, 'No data subject found');

    const [profile, jobsAsWorker, jobsAsClient, ratings, consents, certs, psy, guarantors] = await Promise.all([
      prisma.workerProfile.findUnique({ where: { userId: user.id } }),
      prisma.job.count({ where: { workerId: user.id } }),
      prisma.job.count({ where: { clientId: user.id } }),
      prisma.rating.count({ where: { OR: [{ raterId: user.id }, { rateeId: user.id }] } }),
      prisma.consent.findMany({ where: { userId: user.id } }),
      prisma.certification.findMany({ where: { userId: user.id } }),
      prisma.psychometricResult.findUnique({ where: { userId: user.id } }),
      prisma.guarantor.findMany({ where: { workerId: user.id } }),
    ]);

    await audit(req, 'dpo.data_subject_access', user.id, { query: q.query });
    res.json({
      legalBasis: 'Data-subject access under Personal Data Protection Proclamation No. 1321/2024. Access is logged.',
      user: { id: user.id, name: user.name, phone: user.phone, tier: user.tier, faydaStatus: user.faydaStatus, accountType: user.accountType, createdAt: user.createdAt },
      workerProfile: profile ? { categories: JSON.parse(profile.categories), roles: JSON.parse(profile.roles ?? '[]'), subCity: profile.subCity } : null,
      counts: { jobsAsWorker, jobsAsClient, ratings },
      consents,
      certifications: certs,
      psychometric: psy ? { reliabilityIndex: psy.reliabilityIndex } : null,
      guarantors,
    });
  }),
);

// ── Reconciliation (spec B3.2): journal must balance to zero ─────────────────
adminRouter.get(
  '/reconciliation',
  ah(async (_req, res) => {
    const entries = await prisma.ledgerEntry.findMany();
    const accounts: Record<string, number> = {};
    for (const e of entries) {
      accounts[e.creditAccount] = (accounts[e.creditAccount] ?? 0) + e.amount;
      accounts[e.debitAccount] = (accounts[e.debitAccount] ?? 0) - e.amount;
    }
    const total = Object.values(accounts).reduce((a, b) => a + b, 0);
    res.json({
      balanced: total === 0,
      variance: total,
      accounts,
      entryCount: entries.length,
    });
  }),
);

// ── Leakage signal (spec B1.5): repeat client-worker pairs that went quiet ────
adminRouter.get(
  '/leakage',
  ah(async (_req, res) => {
    const confirmed = await prisma.job.findMany({
      where: { status: 'confirmed', workerId: { not: null } },
      select: { clientId: true, workerId: true, confirmedAt: true },
    });
    const pairs: Record<string, { count: number; last: Date | null }> = {};
    for (const j of confirmed) {
      const key = `${j.clientId}:${j.workerId}`;
      pairs[key] = pairs[key] ?? { count: 0, last: null };
      pairs[key].count += 1;
      if (!pairs[key].last || (j.confirmedAt && j.confirmedAt > pairs[key].last!))
        pairs[key].last = j.confirmedAt;
    }
    const onePairOnly = Object.values(pairs).filter((p) => p.count === 1).length;
    res.json({
      totalPairs: Object.keys(pairs).length,
      singleMatchPairs: onePairOnly,
      repeatRate:
        Object.keys(pairs).length > 0
          ? Number((1 - onePairOnly / Object.keys(pairs).length).toFixed(2))
          : 0,
    });
  }),
);
