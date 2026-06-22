import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { config } from '../config.js';
import { prisma } from './prisma.js';
import { computeScore } from './score.js';

// ════════════════════════════════════════════════════════════════════════════
// Verified Income & Reliability attestation — the lending moat.
//
// A bank can already ask a worker for a bank statement. What it CANNOT get
// elsewhere is a *platform-verified, tamper-evident, consented* record of
// informal-economy work: escrow-confirmed jobs, two-sided ratings, dispute
// history, identity tier, and behavioural reliability signals — signed by
// Serategna so any third party can confirm it was not fabricated or edited.
//
// We sign a canonical (stable-key-order) JSON of the report with HMAC-SHA256.
// Editing any field invalidates the signature. Verification needs no DB lookup,
// so partners can verify offline against a published verification endpoint.
// ════════════════════════════════════════════════════════════════════════════

export const ATTESTATION_SCHEMA = 'serategna.verified-income.v1';

/** Deterministic JSON: recursively sorts object keys so the signature is stable. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(obj[k])).join(',') + '}';
}

export function sign(payload: unknown): string {
  return createHmac('sha256', config.attestationSecret).update(canonical(payload)).digest('hex');
}

/** Constant-time signature check (prevents timing attacks on the HMAC). */
export function verifySignature(payload: unknown, signature: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature ?? '', 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Short, unguessable, human-shareable consent code (e.g. for a QR / SMS). */
export function newConsentCode(): string {
  // 8 bytes of entropy, base32-ish without ambiguous chars.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += alphabet[bytes[i] % alphabet.length];
  return `SRT-${out.slice(0, 5)}-${out.slice(5)}`;
}

export interface VerifiedReport {
  schema: string;
  reportId: string;
  subject: { id: string; name: string; faydaVerified: boolean; memberSince: string; subCity: string };
  income: { verifiedTotalETB: number; monthlyEstimateETB: number; jobsCompleted: number; tenureMonths: number; currency: 'ETB' };
  reliability: {
    serategnaScore: number;
    band: string;
    completionRate: number;
    disputeRate: number;
    avgRating: number;
    reliabilityIndex: number | null;
  };
  signals: Record<string, number>; // score component breakdown (0..1)
  attestation: { issuer: 'Serategna'; issuedAt: string; expiresAt: string; algo: 'HMAC-SHA256' };
}

/** Build the worker's verified report. Excludes PII a lender doesn't need
 *  (phone, Fayda number) — data minimisation. */
export async function buildVerifiedReport(workerId: string, opts?: { expiresAt?: Date; reportId?: string }): Promise<VerifiedReport> {
  const [score, profile, user, disputes] = await Promise.all([
    computeScore(workerId),
    prisma.workerProfile.findUnique({ where: { userId: workerId } }),
    prisma.user.findUnique({ where: { id: workerId }, select: { name: true, tier: true, createdAt: true } }),
    prisma.dispute.count({ where: { job: { workerId } } }),
  ]);
  if (!user) throw new Error('worker not found');

  const tenureMonths = Math.max(1, Math.round((Date.now() - new Date(user.createdAt).getTime()) / (30 * 86400000)));
  const jobsCompleted = score.jobsCompleted;
  const monthlyEstimateETB = Math.round((score.totalEarned ?? 0) / tenureMonths);
  const disputeRate = jobsCompleted > 0 ? Number((disputes / jobsCompleted).toFixed(3)) : 0;
  const psy = await prisma.psychometricResult.findUnique({ where: { userId: workerId } });

  const now = new Date();
  const expiresAt = opts?.expiresAt ?? new Date(now.getTime() + 90 * 86400000);

  return {
    schema: ATTESTATION_SCHEMA,
    reportId: opts?.reportId ?? `RPT-${randomBytes(6).toString('hex').toUpperCase()}`,
    subject: {
      id: workerId,
      name: user.name,
      faydaVerified: user.tier >= 1,
      memberSince: new Date(user.createdAt).toISOString(),
      subCity: profile?.subCity ?? '',
    },
    income: {
      verifiedTotalETB: score.totalEarned ?? 0,
      monthlyEstimateETB,
      jobsCompleted,
      tenureMonths,
      currency: 'ETB',
    },
    reliability: {
      serategnaScore: score.score,
      band: score.band,
      completionRate: Number((profile?.completionRate ?? 0).toFixed(3)),
      disputeRate,
      avgRating: Number((profile?.avgRating ?? 0).toFixed(2)),
      reliabilityIndex: psy?.reliabilityIndex ?? null,
    },
    signals: {
      transactionIntegrity: Number(score.components.transactionIntegrity.toFixed(3)),
      earningsConsistency: Number(score.components.earningsConsistency.toFixed(3)),
      platformBehavior: Number(score.components.platformBehavior.toFixed(3)),
      relationshipCapital: Number(score.components.relationshipCapital.toFixed(3)),
    },
    attestation: { issuer: 'Serategna', issuedAt: now.toISOString(), expiresAt: expiresAt.toISOString(), algo: 'HMAC-SHA256' },
  };
}

/** Hash a partner API key for storage/lookup (keys are never stored in clear). */
export function hashApiKey(key: string): string {
  return createHmac('sha256', config.attestationSecret).update(key).digest('hex');
}
