import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { buildContract } from '../lib/contracts.js';
import { CATEGORIES } from '../lib/catalog.js';
import { notify } from '../lib/notifications.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const contractsRouter = Router();

// ── Generate a contract for a job (client or worker) ─────────────────────────
contractsRouter.post(
  '/from-job/:jobId',
  authRequired,
  ah(async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.jobId },
      include: { client: { select: { name: true } }, worker: { select: { name: true } } },
    });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.clientId !== req.user!.sub && job.workerId !== req.user!.sub)
      throw new HttpError(403, 'Not your job');
    if (!job.workerId) throw new HttpError(400, 'Assign a worker before generating a contract');

    const existing = await prisma.contract.findFirst({ where: { jobId: job.id } });
    if (existing) return res.json(serialize(existing, await sigs(existing.id)));

    const scope = job.description ? [job.description] : [];
    const { title, body, termsJson } = buildContract(job.employmentType, {
      clientName: job.client.name,
      workerName: job.worker?.name ?? 'Worker',
      amount: job.agreedPrice,
      rateType: job.rateType,
      durationLabel: job.durationLabel,
      scope,
      category: CATEGORIES.find((c) => c.key === job.category)?.en ?? job.category,
      subCity: job.subCity,
    });

    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId: job.clientId,
        workerId: job.workerId,
        type: job.employmentType,
        title,
        bodyMarkdown: body,
        termsJson,
        status: 'sent',
      },
    });
    const other = req.user!.sub === job.clientId ? job.workerId : job.clientId;
    if (other) await notify({ userId: other, templateKey: 'contract.to_sign', link: `/app/contract/${contract.id}` });
    res.status(201).json(serialize(contract, []));
  }),
);

// ── My contracts ─────────────────────────────────────────────────────────────
contractsRouter.get(
  '/mine',
  authRequired,
  ah(async (req, res) => {
    const me = req.user!.sub;
    const contracts = await prisma.contract.findMany({
      where: { OR: [{ clientId: me }, { workerId: me }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const withSigs = await Promise.all(
      contracts.map(async (c) => serialize(c, await sigs(c.id))),
    );
    res.json(withSigs);
  }),
);

// ── Contract detail ──────────────────────────────────────────────────────────
contractsRouter.get(
  '/:id',
  authRequired,
  ah(async (req, res) => {
    const c = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!c) throw new HttpError(404, 'Contract not found');
    if (c.clientId !== req.user!.sub && c.workerId !== req.user!.sub)
      throw new HttpError(403, 'Not your contract');
    res.json(serialize(c, await sigs(c.id)));
  }),
);

// ── Sign with OTP digital assent (Proclamation 1205/2020) ────────────────────
contractsRouter.post(
  '/:id/sign',
  authRequired,
  ah(async (req, res) => {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
    const me = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!me) throw new HttpError(404, 'User not found');

    const otp = await prisma.otpCode.findFirst({
      where: { phone: me.phone, code, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new HttpError(401, 'Invalid or expired code');

    const c = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!c) throw new HttpError(404, 'Contract not found');
    const role = c.clientId === me.id ? 'client' : c.workerId === me.id ? 'worker' : null;
    if (!role) throw new HttpError(403, 'You are not a party to this contract');

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    await prisma.contractSignature.upsert({
      where: { contractId_userId: { contractId: c.id, userId: me.id } },
      create: { contractId: c.id, userId: me.id, role, signerName: me.name, method: 'otp' },
      update: { signedAt: new Date() },
    });

    const all = await sigs(c.id);
    const needed = c.workerId ? 2 : 1;
    if (all.length >= needed) {
      await prisma.contract.update({ where: { id: c.id }, data: { status: 'signed' } });
      const other = role === 'client' ? c.workerId : c.clientId;
      if (other) await notify({ userId: other, templateKey: 'contract.fully_signed' });
    }
    const fresh = await prisma.contract.findUnique({ where: { id: c.id } });
    res.json(serialize(fresh!, all));
  }),
);

function sigs(contractId: string) {
  return prisma.contractSignature.findMany({ where: { contractId } });
}

function serialize(c: any, signatures: any[]) {
  return { ...c, termsJson: undefined, terms: JSON.parse(c.termsJson ?? '{}'), signatures };
}
