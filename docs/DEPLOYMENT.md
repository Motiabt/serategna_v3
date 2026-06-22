# Serategna — What's Left Before Deployment & How to Deploy

This is the honest, prioritised list of work remaining before a production
deployment, followed by the concrete deploy procedure. For the controlled-pilot
checklist see `PILOT.md`; for the build story see `BUILD_JOURNAL.md`.

Legend: **P0** = blocks any real deployment · **P1** = needed for a safe pilot ·
**P2** = fast-follow after launch.

---

## A. What's left — engineering

### P0 — blockers
- [ ] **Provision real infrastructure**: managed PostgreSQL, app hosting for API +
      web, TLS, a domain, and a WAF/edge rate-limit in front.
- [ ] **Production secrets**: set 48-char `JWT_*` secrets, `OTP_DEV_MODE=false`,
      `SEED_ON_START=false`, real `DATABASE_URL`. (App refuses to boot otherwise.)
- [ ] **Switch from `db push` to migrations**: run `npm run migrate:deploy`
      against Postgres; stop using `prisma db push` in prod.
- [ ] **Automated backups + a tested restore** for Postgres.
- [ ] **Ethio Telecom SMS go-live**: set `ETHIOTEL_*`, confirm field names against
      the onboarding packet, and pass `npm run sms:test`. (Done in code; needs
      live credentials.)

### P1 — needed for a safe pilot
- [ ] **Fayda/MOSIP identity**: wire `MOSIP_API_KEY`, or staff the manual
      verification queue for the pilot window.
- [ ] **Payment proof capture**: since pay is off-platform, add a receipt /
      transaction-reference field so disputes are resolvable.
- [ ] **Error monitoring**: point `ERROR_WEBHOOK` at a collector (or a Sentry
      tunnel); wire alerts on 5xx rate and `/ready` failures.
- [ ] **CI pipeline**: run `npm test` + `tsc` + `vite build` on every push; block
      merges on red.
- [ ] **Push notifications (FCM)** and the **Telegram** bridge (currently seams).

### P2 — fast-follow
- [ ] **Real-time** via WebSocket/SSE (chat, live tracking still poll).
- [ ] **Geo at scale**: move discovery ranking from in-memory to **PostGIS**
      indexed queries; add infinite-scroll using the existing `?offset`.
- [ ] **Native mobile** via EAS build (today it's a WebView wrapper) or ship a PWA.
- [ ] **Subscription auto-billing + VAT/TOT receipts** (ERCA); today recorded, not charged.
- [ ] **Low-literacy onboarding** (voice/IVR/USSD) + full UI string translation.
- [ ] **Account recovery** (lost SIM), **admin 2FA**, anti-abuse (fake accounts/reviews).
- [ ] **Accessibility pass** (screen-reader labels, focus order, contrast).
- [ ] Replace rule-based "Smart" features with a real LLM **or** keep them as labelled.

## B. What's left — product / ops / legal (people, not code)
- [ ] Trust & safety staffing: verification reviewer, dispute mediator (48h SLA),
      SoS desk monitoring, staffed call centre (`+251 960 00 00 00` / `8294`).
- [ ] Legal: Terms/Privacy reviewed by Ethiopian counsel; data-protection
      registration (Proclamation 1321/2024); guarantor + in-person contract templates.
- [ ] Commercial: confirm the no-custody position with a payments/legal advisor;
      define pilot scope, supply-seeding plan, and success metrics.

## C. Already done (don't redo)
- ✅ Core marketplace loop, ledger reconciles to variance 0, transparent matching/score.
- ✅ Security: OTP lockout/throttle, JWT rotation, Helmet CSP/HSTS, phone masking,
      audited DPO access, **no SQL-injection surface**, pagination caps everywhere.
- ✅ Real OTP/SMS seam (Ethio Telecom), observability, **31 automated tests**,
      health/readiness endpoints, migration scripts, pilot runbook.

---

## D. Deployment procedure (Docker)

1. **Prepare env** (root `.env` for compose, `server/.env` for the API):
   ```bash
   cp .env.example .env
   # set: NODE_ENV=production, strong JWT_* secrets, OTP_DEV_MODE=false,
   #      DATABASE_URL=postgres…, SEED_ON_START=false,
   #      SMS_PROVIDER=ethiotelecom + ETHIOTEL_* , ERROR_WEBHOOK, CORS_ORIGINS
   ```
2. **Build & start**:
   ```bash
   docker compose up --build      # Postgres + API + web (web on :8080, /api proxied)
   ```
   The API container flips Prisma to Postgres (`scripts/use-postgres.mjs`),
   applies the schema, and runs as a non-root user.
3. **Migrate** (instead of seed-on-start in prod):
   ```bash
   docker compose exec api npm run migrate:deploy
   ```
4. **Smoke test**:
   ```bash
   curl https://<host>/health      # {status:ok}
   curl https://<host>/ready       # {db:up}
   npm run sms:test -- +2519XXXXXXXX "Serategna live test"
   ```
5. **Verify before opening to users**: a real OTP login end-to-end, a job
   post→bid→accept→complete→confirm cycle, and that `/ready` is wired to the
   orchestrator's health probe.

## E. Pre-flight gate (all must be true)
- [ ] `cd server && npm test` → green · `tsc --noEmit` → 0 · `cd web && npm run build` → ok
- [ ] `/health` and `/ready` return 200 in the target environment
- [ ] A real SMS OTP was received on a handset and login succeeded
- [ ] Backups run and a restore was tested
- [ ] Secrets are production-grade and `OTP_DEV_MODE=false`
- [ ] Monitoring/alerting receives a test error via `ERROR_WEBHOOK`

---

_Estimate: with infra + Ethio Telecom credentials + Fayda decision in hand, the
P0/P1 items are a few days of integration and ops work — not new product
engineering. The application itself is built and tested._
