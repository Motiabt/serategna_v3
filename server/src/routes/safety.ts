import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { notify } from '../lib/notifications.js';
import { sendSms } from '../lib/sms.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';

export const safetyRouter = Router();

// Worker safety check-in on an active job. Alerts the employer in-app and SMSes
// the worker's guarantor (ዋስ) as the trusted contact — important for domestic
// work (housemaids) where a "she arrived safe" signal builds family trust.
safetyRouter.post(
  '/checkin',
  authRequired,
  ah(async (req, res) => {
    const { jobId, status } = z
      .object({ jobId: z.string(), status: z.enum(['arrived', 'left', 'safe']).default('arrived') })
      .parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.workerId !== req.user!.sub) throw new HttpError(403, 'Only the assigned worker can check in.');

    const worker = await prisma.user.findUnique({ where: { id: req.user!.sub }, select: { name: true } });
    const verb = status === 'left' ? 'has safely finished and left' : status === 'safe' ? 'is safe on' : 'arrived safely at';
    const when = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    await notify({ userId: job.clientId, templateKey: 'system', title: 'Safety check-in', body: `${worker?.name ?? 'Your worker'} ${verb} the job (${when}).`, type: 'system' }).catch(() => undefined);

    // SMS the guarantor / trusted contact.
    const g = await prisma.guarantor.findFirst({ where: { workerId: req.user!.sub, status: 'active' } });
    let contactNotified = false;
    if (g?.phone) {
      const r = await sendSms(g.phone, `Serategna: ${worker?.name ?? 'Your relative'} ${verb} a work assignment at ${when}. They are safe.`);
      contactNotified = r.ok;
    }
    res.json({ ok: true, contactNotified });
  }),
);
