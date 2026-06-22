import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah } from '../middleware/auth.js';

// ════════════════════════════════════════════════════════════════════════════
// Assisted / offline channel — the "delala fix".
//
// Most housemaids have no smartphone or low digital literacy, and both sides
// trust a known human (the delala) over an app. Rather than fight that, we
// FORMALISE it: a vetted, rated, fee-capped Serategna Agent (ወኪል) — paid by
// Serategna, never from the worker's wage — does the hand-holding the delala
// used to, but accountable and transparent. These endpoints capture assisted
// requests from the website / a phone call / a kiosk; the Agent network and
// call centre follow up. Everything still produces a verified, guarantor-backed
// engagement, so the worker's portable record accrues even without a phone.
// ════════════════════════════════════════════════════════════════════════════

export const assistRouter = Router();

const phoneOrEmail = z.string().trim().min(5).max(120);

// Employer wants a vetted housemaid but the worker has no smartphone — an Agent
// brings guarantor-backed candidates and handles the in-person contract.
assistRouter.post(
  '/hire',
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(80),
        contact: phoneOrEmail,
        subCity: z.string().trim().max(40).optional(),
        role: z.string().trim().max(40).default('housemaid'),
        liveIn: z.boolean().optional(),
        startWhen: z.string().trim().max(40).optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(req.body);
    const message = [
      `Role: ${body.role}`,
      body.subCity ? `Sub-city: ${body.subCity}` : '',
      body.liveIn != null ? `Live-in: ${body.liveIn ? 'yes' : 'no'}` : '',
      body.startWhen ? `Start: ${body.startWhen}` : '',
      body.notes ?? '',
    ].filter(Boolean).join(' · ');
    const lead = await prisma.lead.create({
      data: { kind: 'assisted_hire', name: body.name, org: '', contact: body.contact, pkg: body.role, message },
    });
    res.status(201).json({ ok: true, id: lead.id });
  }),
);

// A worker with no smartphone (or a family member on their behalf) asks an Agent
// to onboard them in person / at a kiosk and manage their profile.
assistRouter.post(
  '/register',
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(80),
        contact: phoneOrEmail,
        subCity: z.string().trim().max(40).optional(),
        skill: z.string().trim().max(60).optional(),
        onBehalf: z.boolean().optional(), // a literate relative is requesting for them
      })
      .parse(req.body);
    const message = [
      body.skill ? `Skill: ${body.skill}` : '',
      body.subCity ? `Sub-city: ${body.subCity}` : '',
      body.onBehalf ? 'Requested by a family member on their behalf' : '',
    ].filter(Boolean).join(' · ');
    const lead = await prisma.lead.create({
      data: { kind: 'assisted_register', name: body.name, org: '', contact: body.contact, pkg: body.skill ?? '', message },
    });
    res.status(201).json({ ok: true, id: lead.id });
  }),
);

// Public trust signals for the assisted-hire surfaces (social proof). Counts are
// real where we have them; the agent network size is configurable copy.
assistRouter.get(
  '/stats',
  ah(async (_req, res) => {
    const [placed, agents] = await Promise.all([
      prisma.job.count({ where: { employmentType: 'permanent', status: 'confirmed' } }),
      prisma.agent.count(),
    ]);
    res.json({
      placed,
      agents,
      brokerFee: 0,
      guarantorRequired: true,
      callCenter: '+251 960 00 00 00',
      shortCode: '8294',
    });
  }),
);
