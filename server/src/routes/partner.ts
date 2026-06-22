import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { buildVerifiedReport, sign, verifySignature, hashApiKey } from '../lib/attestation.js';
import { ah, adminRequired, authRequired, HttpError } from '../middleware/auth.js';

// ════════════════════════════════════════════════════════════════════════════
// Partner Lending API — integrated banks/MFIs pull a worker's signed Verified
// Income & Reliability report, but ONLY with that worker's explicit, scoped,
// expiring consent. Authentication is an API key (stored hashed); authorisation
// is a worker-issued consent code. Every access is rate-limited and audited.
// ════════════════════════════════════════════════════════════════════════════

export const partnerRouter = Router();

interface PartnerReq extends Request {
  partner?: { id: string; name: string; slug: string; scopes: string };
}

// Per-key-ish throttle (keyed by API key when present, else IP).
const partnerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  keyGenerator: (req) => (req.headers['x-api-key'] as string)?.slice(0, 16) ?? req.ip ?? 'anon',
});

async function partnerAuth(req: PartnerReq, res: Response, next: NextFunction) {
  try {
    const key = req.headers['x-api-key'];
    if (typeof key !== 'string' || key.length < 20) {
      return res.status(401).json({ error: 'API key required (x-api-key header).' });
    }
    const record = await prisma.partnerKey.findUnique({ where: { keyHash: hashApiKey(key) } });
    if (!record || !record.active) return res.status(401).json({ error: 'Invalid or inactive API key.' });
    req.partner = { id: record.id, name: record.name, slug: record.slug, scopes: record.scopes };
    // Best-effort last-used stamp; never block the request on it.
    prisma.partnerKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    next();
  } catch (e) {
    next(e);
  }
}

if (process.env.NODE_ENV !== 'test') partnerRouter.use(partnerLimiter);

// Key sanity check for integrators.
partnerRouter.get('/v1/ping', partnerAuth, (req: PartnerReq, res) =>
  res.json({ ok: true, partner: req.partner!.name, scopes: req.partner!.scopes }),
);

// Pull a signed Verified Income & Reliability report for a consented worker.
partnerRouter.post(
  '/v1/reports',
  partnerAuth,
  ah(async (req: PartnerReq, res) => {
    const { consentCode } = z.object({ consentCode: z.string().trim().min(8).max(40) }).parse(req.body);
    const consent = await prisma.lendingConsent.findUnique({ where: { code: consentCode } });
    if (!consent) throw new HttpError(404, 'Unknown consent code.');
    if (consent.status !== 'active' || consent.revokedAt) throw new HttpError(403, 'Consent is not active.');
    if (consent.expiresAt.getTime() < Date.now()) {
      await prisma.lendingConsent.update({ where: { id: consent.id }, data: { status: 'expired' } });
      throw new HttpError(403, 'Consent has expired.');
    }
    // The consent must name THIS partner (or be a self-serve link the worker chose to expose to partners).
    if (consent.audience !== req.partner!.slug && consent.audience !== 'self_link') {
      throw new HttpError(403, 'This consent was not granted to your institution.');
    }

    const report = await buildVerifiedReport(consent.workerId, { expiresAt: consent.expiresAt, reportId: `RPT-${consent.id.slice(-10).toUpperCase()}` });
    const signature = sign(report);

    await prisma.lendingConsent.update({
      where: { id: consent.id },
      data: { accessCount: { increment: 1 }, lastAccessAt: new Date() },
    });
    await prisma.auditLog.create({
      data: { actorId: req.partner!.id, action: 'lending.report.pull', target: consent.workerId, meta: JSON.stringify({ consentId: consent.id, partner: req.partner!.slug }), ip: req.ip },
    }).catch(() => undefined);
    logger.info('lending_report_pull', { partner: req.partner!.slug, consent: consent.id });

    res.json({ report, signature, verify: { algo: 'HMAC-SHA256', endpoint: '/api/partner/v1/verify' } });
  }),
);

// Stateless verification — confirm a report was issued by Serategna and is
// unedited and unexpired. No PII is returned; safe to call from anywhere.
partnerRouter.post(
  '/v1/verify',
  ah(async (req, res) => {
    const { report, signature } = z.object({ report: z.record(z.any()), signature: z.string() }).parse(req.body);
    const valid = verifySignature(report, signature);
    const exp = (report as { attestation?: { expiresAt?: string } }).attestation?.expiresAt;
    const expired = exp ? new Date(exp).getTime() < Date.now() : false;
    res.json({ valid: valid && !expired, signatureValid: valid, expired });
  }),
);

// ── Admin: mint a partner API key (returned in clear ONCE). ──────────────────
partnerRouter.post(
  '/keys',
  authRequired,
  adminRequired,
  ah(async (req, res) => {
    const body = z.object({ name: z.string().min(2), slug: z.string().min(2).regex(/^[a-z0-9_-]+$/), scopes: z.string().default('reports:read') }).parse(req.body);
    const { randomBytes } = await import('crypto');
    const apiKey = 'sk_live_' + randomBytes(24).toString('hex');
    await prisma.partnerKey.create({ data: { name: body.name, slug: body.slug, keyHash: hashApiKey(apiKey), scopes: body.scopes } });
    // Returned exactly once; only the hash is stored.
    res.status(201).json({ ok: true, slug: body.slug, apiKey, note: 'Store this key now — it is not retrievable later.' });
  }),
);
