import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  AccessPayload,
} from '../lib/jwt.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';
import { randomUUID } from 'crypto';
import { sendSms, isEthiopianMobile } from '../lib/sms.js';
import { generateTotpSecret, verifyTotp, totpUri } from '../lib/totp.js';
import { logger } from '../lib/logger.js';

export const authRouter = Router();

function payloadFor(u: {
  id: string;
  phone: string;
  isWorker: boolean;
  isClient: boolean;
  isAgent: boolean;
  isAdmin: boolean;
  tier: number;
}): AccessPayload {
  return {
    sub: u.id,
    phone: u.phone,
    roles: { worker: u.isWorker, client: u.isClient, agent: u.isAgent, admin: u.isAdmin },
    tier: u.tier,
  };
}

async function issueTokens(userId: string, payload: AccessPayload) {
  const refreshToken = signRefreshToken(userId);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + config.jwt.refreshTtl * 1000),
    },
  });
  // keep at most 5 active tokens per user (multi-device)
  const tokens = await prisma.refreshToken.findMany({
    where: { userId, revoked: false },
    orderBy: { createdAt: 'desc' },
  });
  if (tokens.length > 5) {
    await prisma.refreshToken.updateMany({
      where: { id: { in: tokens.slice(5).map((t) => t.id) } },
      data: { revoked: true },
    });
  }
  return { accessToken: signAccessToken(payload), refreshToken };
}

// ── Request an OTP ───────────────────────────────────────────────────────────
authRouter.post(
  '/otp/request',
  ah(async (req, res) => {
    const { phone, purpose } = z
      .object({ phone: z.string().min(7), purpose: z.enum(['login', 'register']).default('login') })
      .parse(req.body);

    // OTP is sent only to valid Ethiopian mobile numbers on a licensed network
    // (Ethio Telecom 09… or Safaricom 07…). Diaspora users sign in with email.
    if (!isEthiopianMobile(phone)) {
      throw new HttpError(400, 'Enter a valid Ethiopian mobile number (Ethio Telecom 09… or Safaricom 07…). Outside Ethiopia? Sign in with email.');
    }

    // Per-phone abuse protection: 30s cooldown + max 5 codes / 15 min.
    // Disabled under automated tests so repeated logins don't self-throttle.
    if (config.env !== 'test') {
      const since = new Date(Date.now() - 15 * 60 * 1000);
      const recent = await prisma.otpCode.findMany({
        where: { phone, createdAt: { gt: since } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      if (recent.length >= 5) throw new HttpError(429, 'Too many codes requested. Try again later.');
      if (recent[0] && Date.now() - recent[0].createdAt.getTime() < 30 * 1000)
        throw new HttpError(429, 'Please wait a moment before requesting another code.');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await prisma.otpCode.create({
      data: { phone, code, purpose, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });
    // Deliver over the configured SMS gateway (console in dev). Delivery failure
    // is logged but does not fail the request — the code still exists to verify.
    const sms = await sendSms(phone, `Serategna code: ${code}. Valid 5 minutes. Never share it.`);
    if (!sms.ok) logger.warn('otp.sms_failed', { phone, provider: sms.provider, error: sms.error });
    res.json({ sent: true, devCode: config.otpDevMode ? code : undefined });
  }),
);

async function consumeOtp(phone: string, code: string) {
  // Verify against the latest active code (prevents code-enumeration) and lock
  // after 5 wrong attempts.
  const otp = await prisma.otpCode.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) throw new HttpError(401, 'Invalid or expired code');
  if (otp.attempts >= 5) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    throw new HttpError(429, 'Too many attempts. Request a new code.');
  }
  if (otp.code !== code) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(401, 'Invalid code');
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
}

// ── Register ─────────────────────────────────────────────────────────────────
authRouter.post(
  '/register',
  ah(async (req, res) => {
    const body = z
      .object({
        phone: z.string().min(7),
        code: z.string().length(6),
        name: z.string().min(1),
        role: z.enum(['worker', 'client']),
        language: z.enum(['en', 'am', 'om']).default('en'),
        acceptTerms: z.boolean().default(false),
      })
      .parse(req.body);

    if (!body.acceptTerms)
      throw new HttpError(400, 'You must accept the Terms & Privacy Policy to continue');
    const existing = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (existing) throw new HttpError(409, 'Phone already registered — please log in');
    await consumeOtp(body.phone, body.code);

    const user = await prisma.user.create({
      data: {
        phone: body.phone,
        name: body.name,
        language: body.language,
        isWorker: body.role === 'worker',
        isClient: true,
        ...(body.role === 'worker'
          ? { workerProfile: { create: {} } }
          : {}),
      },
    });

    // consent ledger (Proclamation 1321/2024)
    await prisma.consent.createMany({
      data: [
        { userId: user.id, document: 'terms', version: '1.0' },
        { userId: user.id, document: 'privacy', version: '1.0' },
        { userId: user.id, document: 'contractor_agreement', version: '1.0' },
      ],
    });

    const payload = payloadFor(user);
    const tokens = await issueTokens(user.id, payload);
    res.status(201).json({ user: publicUser(user), ...tokens });
  }),
);

// ── Login ────────────────────────────────────────────────────────────────────
authRouter.post(
  '/login',
  ah(async (req, res) => {
    const { phone, code, totp } = z
      .object({ phone: z.string().min(7), code: z.string().length(6), totp: z.string().optional() })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { phone }, omit: { totpSecret: false } });
    if (!user) throw new HttpError(404, 'No account for this phone — please register');
    await consumeOtp(phone, code);

    // Second factor (TOTP) for users who enrolled it.
    let mfa = false;
    if (user.totpEnabled && user.totpSecret) {
      if (!totp) {
        // OTP was valid; ask the client to supply the authenticator code next.
        return res.status(401).json({ error: 'Authenticator code required', mfaRequired: true });
      }
      if (!verifyTotp(user.totpSecret, totp)) throw new HttpError(401, 'Invalid authenticator code');
      mfa = true;
    }

    const tokens = await issueTokens(user.id, { ...payloadFor(user), mfa });
    res.json({ user: publicUser(user), ...tokens });
  }),
);

// ── Diaspora email sign-in (register/login via email + emailed code) ─────────
authRouter.post(
  '/email/request',
  ah(async (req, res) => {
    const { email } = z.object({ email: z.string().email().max(120) }).parse(req.body);
    const key = `email:${email.toLowerCase()}`;
    // light per-address throttle
    const recent = await prisma.otpCode.findFirst({ where: { phone: key, createdAt: { gt: new Date(Date.now() - 30 * 1000) } } });
    if (recent && config.env !== 'test') throw new HttpError(429, 'Please wait a moment before requesting another code.');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await prisma.otpCode.create({ data: { phone: key, code, purpose: 'login', expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    // Email delivery seam (no provider wired yet) — log + return in dev.
    logger.info('email.otp', { email });
    res.json({ sent: true, devCode: config.otpDevMode ? code : undefined });
  }),
);
authRouter.post(
  '/email/login',
  ah(async (req, res) => {
    const { email, code, name } = z
      .object({ email: z.string().email().max(120), code: z.string().length(6), name: z.string().min(1).max(80).optional() })
      .parse(req.body);
    const lower = email.toLowerCase();
    await consumeOtp(`email:${lower}`, code);
    let user = await prisma.user.findUnique({ where: { email: lower } });
    if (!user) {
      // First email sign-in = diaspora registration.
      user = await prisma.user.create({
        data: { phone: `dia_${randomUUID().slice(0, 8)}`, email: lower, name: name ?? lower.split('@')[0], language: 'en', accountType: 'diaspora', tier: 1, faydaStatus: 'verified', isClient: true },
      });
      await prisma.consent.createMany({ data: [
        { userId: user.id, document: 'terms', version: '1.0' },
        { userId: user.id, document: 'privacy', version: '1.0' },
      ] });
    }
    const tokens = await issueTokens(user.id, payloadFor(user));
    res.json({ user: publicUser(user), ...tokens });
  }),
);

// ── Refresh ──────────────────────────────────────────────────────────────────
authRouter.post(
  '/refresh',
  ah(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    let decoded: { sub: string };
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError(401, 'Invalid refresh token');
    }
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new HttpError(401, 'Refresh token expired or revoked');
    }
    // rotate
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) throw new HttpError(401, 'User not found');
    const tokens = await issueTokens(user.id, payloadFor(user));
    res.json(tokens);
  }),
);

// ── Logout ───────────────────────────────────────────────────────────────────
authRouter.post(
  '/logout',
  authRequired,
  ah(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body ?? {});
    if (refreshToken) {
      await prisma.refreshToken.updateMany({ where: { token: refreshToken }, data: { revoked: true } });
    }
    res.json({ ok: true });
  }),
);

// ── Me ───────────────────────────────────────────────────────────────────────
authRouter.get(
  '/me',
  authRequired,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: { workerProfile: true, agentProfile: true },
    });
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user: publicUser(user), workerProfile: user.workerProfile, agentProfile: user.agentProfile });
  }),
);

// ── Self-service data export (Proclamation 1321/2024 right of access) ────────
authRouter.get(
  '/me/export',
  authRequired,
  ah(async (req, res) => {
    const id = req.user!.sub;
    const [user, workerProfile, businessProfile, jobsAsClient, jobsAsWorker, bids, ratings, certifications, guarantors, consents, savings] = await Promise.all([
      prisma.user.findUnique({ where: { id } }),
      prisma.workerProfile.findUnique({ where: { userId: id } }),
      prisma.businessProfile.findUnique({ where: { userId: id } }),
      prisma.job.findMany({ where: { clientId: id } }),
      prisma.job.findMany({ where: { workerId: id } }),
      prisma.bid.findMany({ where: { workerId: id } }),
      prisma.rating.findMany({ where: { OR: [{ raterId: id }, { rateeId: id }] } }),
      prisma.certification.findMany({ where: { userId: id } }),
      prisma.guarantor.findMany({ where: { workerId: id } }),
      prisma.consent.findMany({ where: { userId: id } }),
      prisma.savingsGoal.findUnique({ where: { userId: id } }),
    ]);
    if (!user) throw new HttpError(404, 'User not found');
    res.setHeader('Content-Disposition', 'attachment; filename="serategna-my-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      legalBasis: 'Your personal data held by Serategna (Proclamation No. 1321/2024 right of access).',
      account: publicUser(user),
      workerProfile, businessProfile, jobsAsClient, jobsAsWorker, bids, ratings, certifications, guarantors, consents, savings,
    });
  }),
);

// ── Self-service account deletion / right to erasure ─────────────────────────
// Anonymises the account (removes PII) and revokes sessions. Job/ledger records
// are retained in de-identified form for financial reconciliation & disputes.
authRouter.delete(
  '/me',
  authRequired,
  ah(async (req, res) => {
    const { confirm } = z.object({ confirm: z.literal('DELETE') }).parse(req.body ?? {});
    void confirm;
    const id = req.user!.sub;
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({ where: { userId: id }, data: { revoked: true } });
      await tx.workerProfile.updateMany({ where: { userId: id }, data: { availability: 'offline', bio: '' } });
      await tx.user.update({
        where: { id },
        data: { name: 'Deleted user', phone: `deleted_${id}`, email: null, faydaNumber: null, faydaStatus: 'none', isWorker: false, isClient: false },
      });
    });
    res.json({ ok: true, deleted: true });
  }),
);

// ── Active sessions / devices (list + revoke) ────────────────────────────────
authRouter.get(
  '/sessions',
  authRequired,
  ah(async (req, res) => {
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: req.user!.sub, revoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, expiresAt: true },
    });
    res.json(tokens);
  }),
);
authRouter.post(
  '/sessions/revoke-all',
  authRequired,
  ah(async (req, res) => {
    // Revoke every refresh token for this user (sign out all other devices).
    const r = await prisma.refreshToken.updateMany({ where: { userId: req.user!.sub, revoked: false }, data: { revoked: true } });
    res.json({ ok: true, revoked: r.count });
  }),
);

// ── Two-factor authentication (TOTP / authenticator app) ─────────────────────
authRouter.post(
  '/2fa/setup',
  authRequired,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new HttpError(404, 'User not found');
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret, totpEnabled: false } });
    res.json({ secret, otpauthUri: totpUri(secret, user.phone.startsWith('dia_') ? (user.email ?? user.id) : user.phone) });
  }),
);
authRouter.post(
  '/2fa/enable',
  authRequired,
  ah(async (req, res) => {
    const { token } = z.object({ token: z.string().length(6) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, omit: { totpSecret: false } });
    if (!user?.totpSecret) throw new HttpError(400, 'Start 2FA setup first.');
    if (!verifyTotp(user.totpSecret, token)) throw new HttpError(401, 'Invalid code — check your authenticator and try again.');
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
    res.json({ ok: true, enabled: true });
  }),
);
authRouter.post(
  '/2fa/disable',
  authRequired,
  ah(async (req, res) => {
    const { token } = z.object({ token: z.string().length(6) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, omit: { totpSecret: false } });
    if (!user?.totpSecret || !verifyTotp(user.totpSecret, token)) throw new HttpError(401, 'Invalid code.');
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
    res.json({ ok: true, enabled: false });
  }),
);

// ── Become a worker (enable worker mode) ─────────────────────────────────────
authRouter.post(
  '/enable-worker',
  authRequired,
  ah(async (req, res) => {
    const existing = await prisma.workerProfile.findUnique({ where: { userId: req.user!.sub } });
    if (!existing) await prisma.workerProfile.create({ data: { userId: req.user!.sub } });
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { isWorker: true },
    });
    const tokens = await issueTokens(user.id, payloadFor(user));
    res.json({ user: publicUser(user), ...tokens });
  }),
);

// ── Update account type (household / business / sme / diaspora) ──────────────
authRouter.patch(
  '/account-type',
  authRequired,
  ah(async (req, res) => {
    const { accountType } = z
      .object({ accountType: z.enum(['household', 'business', 'sme', 'diaspora']) })
      .parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.sub }, data: { accountType } });
    res.json({ user: publicUser(user) });
  }),
);

export function publicUser(u: {
  id: string;
  phone: string;
  email?: string | null;
  name: string;
  language: string;
  isWorker: boolean;
  isClient: boolean;
  isAgent: boolean;
  isAdmin: boolean;
  adminRole?: string | null;
  tier: number;
  faydaStatus: string;
  accountType?: string;
}) {
  return {
    id: u.id,
    phone: u.phone.startsWith('dia_') ? '' : u.phone, // diaspora has no ET phone
    email: u.email ?? null,
    name: u.name,
    language: u.language,
    roles: { worker: u.isWorker, client: u.isClient, agent: u.isAgent, admin: u.isAdmin },
    adminRole: u.adminRole ?? null,
    tier: u.tier,
    faydaStatus: u.faydaStatus,
    accountType: u.accountType ?? 'household',
  };
}
