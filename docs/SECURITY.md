# Serategna — Security Baseline (spec E1)

Security is not a Phase 2 feature — the escrow ledger holds real money from day one.

## Hardening added (latest)

- **OTP brute-force & abuse protection** — verification locks after 5 wrong
  attempts; issuance is throttled per phone (30s cooldown, max 5/15min) and per
  IP (dedicated `otpLimiter`, 20/15min) on top of the auth limiter.
- **Helmet locked down** — strict CSP (`default-src 'none'`), HSTS (1y, preload),
  `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy: same-site`,
  `x-powered-by` disabled.
- **Tamper-evident audit log** (`AuditLog`) — every sensitive admin action
  (verification decisions, dispute resolutions, SoS resolutions) is recorded with
  actor, target, metadata and IP.
- **No funds custody** — the platform never holds money (direct pay), removing an
  entire class of financial-attack surface and the NBE PII-licence requirement.

## Implemented

- **Authentication** — phone OTP; JWT access tokens (15 min) + refresh tokens
  (30 day, **single-use rotation**, max 5 active per user). OTP codes are never
  returned in responses unless `OTP_DEV_MODE=true` (forced off in production).
- **Production secret guard** — the API refuses to boot in `NODE_ENV=production`
  if JWT secrets are missing/weak/default, or if `OTP_DEV_MODE` is on (`src/config.ts`).
- **Transport** — terminate TLS 1.3 at your edge/ingress; nginx ships HSTS-ready
  security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`). Enable a cert (Let's Encrypt) in front of the `web` service.
- **Ledger immutability** — append-only by design (no UPDATE/DELETE in code). In
  Postgres, enforce at the DB role level too:
  `REVOKE UPDATE, DELETE ON ledger_entries FROM app_write_role;`
- **Payments** — aggregator behind an adapter; `verifyWebhook()` (HMAC) is the
  inbound-confirmation seam. Worker payouts have a **daily cap** (`PAYOUT_DAILY_CAP`,
  default ETB 10,000) above which manual review is required.
- **SoS audio** — Serategna stores only a reference; audio is encrypted for the
  emergency-response provider's key and **cannot be decrypted by Serategna** (a
  trust feature). Modelled in `sos_events.audioRef`.
- **Access control** — admin routes require an admin role (`adminRequired`);
  `adminRole` distinguishes operations / finance / trust_safety / super_admin.
- **Rate limiting** — global 600/15min, auth 40/15min (Redis token-bucket in prod).
- **Input validation** — every endpoint validates with Zod; helmet + CORS allowlist.

## Before first public transaction (operational checklist, spec B4)

- [ ] Replace JWT secrets with `openssl rand -hex 48` values.
- [ ] `OTP_DEV_MODE=false`; wire a local SMS gateway in `lib/notifications.ts`.
- [ ] Point `PAYMENT_ADAPTER` at a licensed PSO adapter; implement `verifyWebhook`.
- [ ] Postgres: apply append-only grants on `ledger_entries`; enable PITR backups.
- [ ] Data residency in Ethiopia; appoint DPO before Phase 2 (Proclamation 1321/2024).
- [ ] Independent penetration test before Phase 2 launch.

## Known dev-only advisories

`npm audit` may flag dev-only tooling (e.g., esbuild via Vite) — these are not in
the production runtime image (web ships as static files via nginx; the API runs
`--omit=dev`). CI runs `npm audit --omit=dev --audit-level=high`.
