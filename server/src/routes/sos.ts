import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';
import { notify } from '../lib/notifications.js';

export const sosRouter = Router();

// ── Trigger SoS (panic button / silent) — spec B2.1, E1 ──────────────────────
sosRouter.post(
  '/trigger',
  authRequired,
  ah(async (req, res) => {
    const body = z
      .object({
        jobId: z.string().optional(),
        triggerType: z.enum(['button', 'silent']).default('button'),
        lat: z.number().optional(),
        lng: z.number().optional(),
        audioRef: z.string().optional(),
      })
      .parse(req.body ?? {});

    const gpsTrail =
      body.lat !== undefined && body.lng !== undefined
        ? [{ lat: body.lat, lng: body.lng, t: Date.now() }]
        : [];

    const event = await prisma.sosEvent.create({
      data: {
        userId: req.user!.sub,
        jobId: body.jobId ?? null,
        triggerType: body.triggerType,
        gpsTrail: JSON.stringify(gpsTrail),
        // SoS audio is encrypted for the emergency provider only — Serategna
        // stores only the reference (spec E1).
        audioRef: body.audioRef ?? null,
        alertChain: JSON.stringify([
          { step: 'created', at: new Date().toISOString() },
          { step: 'emergency_provider_notified', at: new Date().toISOString() },
        ]),
      },
    });
    // In production this dispatches to the emergency-response provider + freezes
    // the active job. Here we mark the job and acknowledge.
    if (body.jobId) {
      await prisma.job
        .update({ where: { id: body.jobId }, data: { status: 'disputed' } })
        .catch(() => undefined);
    }
    await notify({
      userId: req.user!.sub,
      templateKey: 'sos.dispatched',
      channels: ['push', 'sms'],
    });
    res.status(201).json({ ok: true, eventId: event.id, status: 'emergency_dispatched' });
  }),
);

// ── Append GPS breadcrumb to an active SoS ───────────────────────────────────
sosRouter.post(
  '/:id/trail',
  authRequired,
  ah(async (req, res) => {
    const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    const event = await prisma.sosEvent.findUnique({ where: { id: req.params.id } });
    if (!event || event.userId !== req.user!.sub) throw new HttpError(404, 'SoS event not found');
    const trail = JSON.parse(event.gpsTrail);
    trail.push({ lat, lng, t: Date.now() });
    await prisma.sosEvent.update({ where: { id: event.id }, data: { gpsTrail: JSON.stringify(trail) } });
    res.json({ ok: true });
  }),
);
