# Serategna v3 — Full System Audit

_Scope: server (6,841 LOC, 28 route modules, 36 models), web (7,438 LOC), mobile, infra, docs.
Method: direct code inspection + live verification. Legend: 🔴 high · 🟠 medium · 🟡 low · ✅ strength._

## Executive summary

Serategna is **well-built on the correctness/security axis and immature on the
scale/operations axis** — exactly the "works at 1 request, not engineered for
10,000" pattern. Auth, validation, secrets hygiene, error handling, and the
double-entry money model are genuinely production-grade. The risks are: **thin
test coverage on the money paths**, **single-instance infra assumptions**, and a
**stored XSS** (found and fixed during this audit). No dependency vulnerabilities.

## Findings (severity-ranked)

| # | Sev | Area | Finding | Status |
|---|-----|------|---------|--------|
| 1 | 🔴 | Security | **Stored XSS** in `ContractDetail.renderMarkdown` → `bold()` fed user-supplied contract text into `dangerouslySetInnerHTML` without escaping HTML | **FIXED this audit** (escape, then re-add only `<strong>`) |
| 2 | 🔴 | Tests | Only **4 test files / 34 tests** for a credit/fintech app; money paths (escrow split, advance, payout caps, score) largely untested | Open |
| 3 | 🔴 | Money | Double-entry `ledger.post()` writes lines but does **not assert Σdebits == Σcredits** — an unbalanced caller silently corrupts the ledger | Open |
| 4 | 🟠 | Scale | Rate limiter uses in-memory `MemoryStore` → **per-process**; breaks the moment >1 instance runs (limits become N×) | Open (needs Redis store) |
| 5 | 🟠 | Scale | **No queue / async workers** — SMS, notifications, score snapshots, payment side-effects run inline in the request | Open (BullMQ) |
| 6 | 🟠 | Resilience | **No timeouts / retries / circuit breakers** on external deps (SMS, PSP, Fayda) — a slow dep exhausts the request pool | Open |
| 7 | 🟠 | Data | **SQLite (dev) vs Postgres (prod)** divergence — already caused real schema drift/data-loss | Open (Postgres in dev) |
| 8 | 🟠 | Security | **AuthZ is ad-hoc** — correct per-route ownership checks (`req.user.sub === owner`) but no centralized policy; easy to miss on a new route. No DB row-level security | Open |
| 9 | 🟠 | Observability | No metrics, tracing, error-tracking, or alerting/SLOs (only logs + audit + health probes) | Open |
| 10 | 🟠 | Code health | `partner.ts` is **dead code** (not mounted) and references models reconciled only via `db pull`; ships an unused `sk_live_` key generator | Open (delete or wire) |
| 11 | 🟡 | i18n | ~**93 hardcoded UI strings** remain (Profile, JobDetail, Landing, Enterprises, Admin, etc.) | In progress |
| 12 | 🟡 | Mobile | "Mobile app" is a **59-line shell, 0 components** — effectively a stub | Open |
| 13 | 🟡 | Ops | Dev uses `prisma db push`; prod needs versioned `migrate deploy`. Backups/PITR undefined | Open |
| 14 | 🟡 | i18n quality | AM/OM are machine-grade; need native review before pilot | Open |

## Strengths (credit where due) ✅

- **Error handling**: Zod→400 (with field details), `HttpError`→status, 500s **never leak internals** (reported to `captureError` with request-id).
- **Secrets**: env + `.gitignore`d; **fail-fast** on weak/`dev-` secrets in prod; partner keys HMAC-hashed; gitleaks in CI. (Past `dev.db.backup` leak untracked + ignore hardened.)
- **PII**: Prisma **global omit** of `totpSecret`/`faydaNumber` — can't leak even from a raw row.
- **AuthN**: phone OTP + JWT access/refresh + optional admin TOTP 2FA + OTP brute-force throttle.
- **Validation**: `zod` on every endpoint; server recomputes limits (e.g. advance max) rather than trusting the client.
- **Money model**: double-entry ledger, integer birr (no float), money mutations wrapped in `$transaction`; `confirm`/`finalize` atomic.
- **Webhooks**: payment `/webhook` is public-by-design but **HMAC-verified** (correct).
- **Transport**: Helmet (locked CSP, HSTS), CORS allowlist, body cap, `x-powered-by` off.
- **Dependencies**: **0 vulnerabilities** (server + web, `npm audit`).
- **Ops basics**: `/health` + `/ready` probes, graceful shutdown (drains pool), request-id correlation, structured logs, audit trail.

## Remediation order (highest leverage first)

1. **Ledger invariant (#3)** — add `assert Σdebits == Σcredits` in `post()`. ~5 lines, prevents silent money corruption.
2. **Money-path tests (#2)** — escrow split, advance accept+repay, payout caps, score; gate in CI.
3. **Redis (#4, #5, partial #9)** — one add unlocks shared rate-limit store + shared cache + job queue.
4. **Postgres in dev (#7)** — kills the divergence class; prerequisite for pooling/RLS.
5. **Resilience (#6)** — timeout + retry + breaker + Idempotency-Key on PSP/SMS/Fayda.
6. **Centralize authZ (#8)** + delete dead `partner.ts` (#10).
7. **Observability (#9)** — metrics + error tracking + 4–5 alert SLOs.
8. Finish i18n (#11), decide mobile scope (#12), versioned migrations + backups (#13).

> See [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) for the NFR scorecard and the design-time guardrail this audit maps to.
