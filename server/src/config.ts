import 'dotenv/config';

function num(key: string, fallback: number): number {
  const v = process.env[key];
  return v === undefined ? fallback : Number(v);
}

export const config = {
  // env: process.env.IS_PRODUCTION ?? 'development',
  env: 'development',
  port: num('PORT', 4000),
  isProd: process.env.NODE_ENV === 'production',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessTtl: num('ACCESS_TOKEN_TTL', 900),
    refreshTtl: num('REFRESH_TOKEN_TTL', 2592000),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),
  economics: {
    takeRateHome: num('TAKE_RATE_HOME', 0.07),
    takeRateDelivery: num('TAKE_RATE_DELIVERY', 0.1),
    takeRateBusiness: num('TAKE_RATE_BUSINESS', 0.05), // business/SME accounts (Business Model §1.4)
    guaranteeReserveRate: num('GUARANTEE_RESERVE_RATE', 0.01),
    tier0JobCap: num('TIER0_JOB_CAP', 5),
    tier0GrossCap: num('TIER0_GROSS_CAP', 4000),
  },
  otpDevMode: (process.env.OTP_DEV_MODE ?? 'true') === 'true',
  // Require admins to pass TOTP 2FA for the admin console (recommended in prod).
  requireAdmin2fa: (process.env.REQUIRE_ADMIN_2FA ?? 'false') === 'true',
  payouts: {
    dailyCap: num('PAYOUT_DAILY_CAP', 10000), // spec E1
  },
  // HMAC secret for signing Verified Income reports & hashing partner API keys
  // (lib/attestation.ts). Must be a strong random value in production.
  attestationSecret: process.env.ATTESTATION_SECRET ?? 'dev-attestation-secret',
};

// Fail fast in production on insecure defaults (spec E1).
if (config.isProd) {
  const weak = [
    ['JWT_ACCESS_SECRET', config.jwt.accessSecret],
    ['JWT_REFRESH_SECRET', config.jwt.refreshSecret],
    ['ATTESTATION_SECRET', config.attestationSecret],
  ].filter(([, v]) => !v || v.length < 32 || v.includes('dev-'));
  if (weak.length) {
    throw new Error(
      `Refusing to start: weak/default secrets in production: ${weak.map(([k]) => k).join(', ')}. ` +
        'Set 48+ char random values (openssl rand -hex 48).',
    );
  }
  if (config.otpDevMode) {
    throw new Error('Refusing to start: OTP_DEV_MODE must be false in production.');
  }
}
