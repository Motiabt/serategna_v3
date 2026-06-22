# Serategna — Controlled Pilot Runbook

This document is the go/no-go checklist and operational runbook for a **controlled
pilot** (e.g. permanent-housemaid hiring in one Addis Ababa sub-city). It reflects
the hardening done in this build: real OTP/SMS delivery, observability, an
automated test suite, and migration/backup procedures.

---

## 1. What changed to make this pilot-ready

| Gap (previously) | Now |
|---|---|
| OTP only logged to console | **Real SMS delivery** behind a provider seam (`http`/`twilio`), console fallback in dev — `server/src/lib/sms.ts` |
| No observability | **Structured JSON logging**, per-request `x-request-id`, `/health` + `/ready` (DB check), and a 500-error capture hook (`ERROR_WEBHOOK`) — `server/src/lib/logger.ts` |
| Zero automated tests | **30 tests** (15 unit + 15 integration) — `npm test` |
| `db push` only | **Migration scripts** (`migrate:dev`, `migrate:deploy`) + backup procedure below |
| "AI" over-claimed | Rebranded to **"Smart"** (honest: rule-based matching, not an LLM) |
| Unbounded list queries | **Pagination caps** on every list endpoint |
| Refresh-token collision on rapid re-login | Fixed with a per-token `jti` |

---

## 2. Pre-pilot checklist (go/no-go)

### Infrastructure
- [ ] Provision **PostgreSQL** (managed preferred) and set `DATABASE_URL`.
- [ ] Deploy API + web (Docker Compose provided; put TLS/WAF in front).
- [ ] Point a domain at the web app; set `CORS_ORIGINS` to it.
- [ ] Configure `/health` (liveness) and `/ready` (readiness) in the orchestrator.

### Secrets & config (production `.env`)
- [ ] `NODE_ENV=production`
- [ ] `OTP_DEV_MODE=false`  ← **must** (otherwise codes are returned in the API response)
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` = 48+ random chars (`openssl rand -hex 48`)
- [ ] `SEED_ON_START=false`
- [ ] The app **refuses to boot** in production with weak secrets or dev OTP mode — this is by design.

### SMS / OTP (the #1 blocker — login fails without it)
- [ ] **Ethio Telecom** is the chosen provider: set `SMS_PROVIDER=ethiotelecom`,
      `ETHIOTEL_SMS_URL`, `ETHIOTEL_SENDER` (approved sender id / short code), and
      either `ETHIOTEL_TOKEN` or `ETHIOTEL_USERNAME`/`ETHIOTEL_PASSWORD` from your
      Ethio Telecom enterprise SMS onboarding packet.
- [ ] Confirm the gateway's exact request field names against that packet
      (`server/src/lib/sms.ts` sends common aliases; adjust if the gateway differs).
- [ ] Send a real test: `npm run sms:test -- +2519XXXXXXXX "Serategna test"` →
      confirm the handset receives it, then complete an end-to-end OTP login.
- [ ] Numbers are auto-normalised to `2519XXXXXXXX`, so `+251…`, `09…` and `9…` all work.

### Identity & payments
- [ ] Fayda/MOSIP: either wire `MOSIP_API_KEY`, or staff the **manual verification** queue (admin console) for the pilot.
- [ ] Payments are **off-platform** (direct Telebirr/CBE/cash) — no PI licence needed. Brief pilot users that they pay the worker directly.

### Data
- [ ] Run migrations against the prod DB (see §4).
- [ ] Enable **automated backups** + test a restore (see §4).

### Observability
- [ ] Set `ERROR_WEBHOOK` to your collector (or tunnel to Sentry).
- [ ] Confirm logs are shipped off-host and `x-request-id` is searchable.

### Trust & safety ops (people, not code)
- [ ] Verification reviewer assigned (Tier 0 → Tier 1).
- [ ] Dispute mediator assigned with the 48h SLA.
- [ ] SoS emergency provider contact in place; SoS desk monitored.
- [ ] Call centre staffed: `+251 960 00 00 00` / short code `8294`.

### Legal
- [ ] Terms/Privacy reviewed by Ethiopian counsel; data handling registered (Proclamation 1321/2024).
- [ ] Guarantor (ዋስ) and in-person contract templates reviewed.

---

## 3. Running the tests

```bash
cd server
npm test          # provisions an isolated test.db, seeds it, runs all 30 tests
npm run test:unit # pure-logic units only (no DB) — fast
npm run test:watch
```

The suite covers: auth/OTP + JWT, authorization (401/403), wage-floor enforcement,
ledger reconciliation, pagination clamping, error handling (400/404), health &
readiness, enterprise/public surfaces, and the core algorithms (matching, wage,
score weights, psychometrics, pagination).

---

## 4. Database: migrations & backups

**Dev → first migration (SQLite):**
```bash
cd server
npm run migrate:dev -- --name init     # creates prisma/migrations
```

**Production (Postgres):** the Docker build flips Prisma's provider to Postgres.
Apply migrations on deploy (not `db push`):
```bash
npm run migrate:deploy
```

**Backups (managed Postgres):** enable automated daily snapshots + PITR. For a
self-managed DB, a daily `pg_dump` to off-host object storage, and **test a
restore before launch**. Backups you have never restored do not exist.

---

## 5. Health & monitoring endpoints

| Endpoint | Use |
|---|---|
| `GET /health` | Liveness — process is up |
| `GET /ready` | Readiness — DB reachable (503 if not) |

Every response carries `x-request-id`; 500s are logged as structured JSON and
forwarded to `ERROR_WEBHOOK` when set. Alert on: `/ready` failures, 5xx rate,
OTP `sms_failed` logs, and dispute/SoS queue depth.

---

## 6. Known limitations to brief the pilot team on

These are acceptable for a controlled pilot but are **not** yet production-scale:

- **Real-time is polling**, not WebSocket — chat/tracking updates lag a little.
- **Discovery ranking is in-memory** over a bounded candidate window (≤300) — fine
  at pilot volume; needs PostGIS/geo-indexing before scale.
- **Push/Telegram** channels are seams (SMS is live; push falls back to no-op).
- **Mobile** is a WebView wrapper of the web app (real native build via EAS later).
- **Smart CV / job draft** are rule-based matchers, not an LLM.
- **Subscription is recorded but not auto-charged** — collect the ETB 100/mo
  manually during the pilot; wire billing + receipts before GA.

---

## 7. Pilot success metrics (suggested)

- Verified workers onboarded; Tier-1 share.
- Jobs posted → matched → confirmed (funnel completion).
- Median time-to-hire; dispute rate; SoS incidents.
- Repeat-pair on-platform share (anti-leakage) — target ≥ 60%.
- OTP delivery success rate (watch `sms_failed`).

---

_Serategna · ሰራተኛ — prepared for Mo Creatives, Addis Ababa. Confidential._
