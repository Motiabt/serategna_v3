# Serategna — Launch-Readiness Report (signed-off by domain)

Assessed against the Complete App Readiness Checklist. Status legend:
**✅ Pass** (done & verified in code/tests) · **🟡 Partial** (built, needs work/credentials) ·
**❌ Not done** (infra/ops/legal — outside the dev build) · **⚪ N/A**.

Evidence is grounded in this codebase, verified this session: `tsc` = 0 (server+web),
`vite build` ✓, **31 automated tests green**, and live API/proxy checks.

> **Headline verdict: NOT cleared for production yet.** The *application engineering*
> is strong (security fundamentals, working journeys, tests, observability hooks).
> The outstanding items are **infrastructure, ops, external credentials, and legal**
> — not product code. See the Final Launch Gate at the end.

---

## A. Frontend — 🟡 Partial
| Item | Status | Evidence |
|---|---|---|
| All user journeys tested | ✅ | post→bid→accept→sign→pay→confirm; admin/enterprise consoles; manual + API e2e |
| Responsive / mobile / tablet | ✅ | mobile-first phone frame, Tailwind responsive; overlap pass done |
| Dark mode | ✅ | `lib/theme.tsx`, descendant-class dark overrides, tested |
| Accessibility | 🟡 | truncation/contrast fixed; **no formal ARIA/screen-reader/contrast audit** |
| Design system / spacing / type | ✅ | navy+cyan system, SF/Sora, components in `components/ui` |
| Forms: validation/error/success/loading | ✅ | Zod-backed errors, toasts, skeletons, spinners |
| Offline handling | ❌ | no service worker / PWA shell |
| Deep linking / nav stack / back / session | ✅ | React Router, refresh-token session persistence |
| Performance: bundle/images/memory/network | 🟡 | bundle ~115KB gzip; **list payloads fixed** (no base64 logos); no formal profiling |
| No secrets / API keys in frontend | ✅ | grep clean; web only uses `VITE_*` public vars |

## B. Backend — ✅ Pass (core), 🟡 (a few)
| Item | Status | Evidence |
|---|---|---|
| Service boundaries / scalability | ✅ | stateless API, bounded queries; `docs/SCALING.md` (500k plan) |
| Logging / monitoring hooks | ✅ | `lib/logger.ts` structured JSON, `x-request-id`, `captureError` seam |
| REST standards | ✅ | resource routers, consistent error envelope |
| API versioning | ❌ | **no `/v1` prefix** — add before public API consumers |
| Pagination | ✅ | `pageParams` clamps every list (`MAX_PAGE=100`) |
| Rate limiting | ✅ | global/auth/OTP limiters; `trust proxy` set |
| Request/response validation | ✅ | **Zod on every body/query** (44 parse sites) |
| Input sanitization / authz checks | ✅ | Zod + per-route ownership/role checks; admin globally gated |
| Duplicate prevention / transactions | ✅ | unique constraints; `$transaction` on finalize/confirm |
| Retry / queue handling | 🟡 | SMS/notify fail-soft; **no queue yet** (documented for scale) |

## C. Database — 🟡 Partial
| Item | Status | Evidence |
|---|---|---|
| Normalized / relations / FKs / constraints | ✅ | Prisma schema, 30+ models, relations + `@@unique` |
| Indexes optimized | ✅ | hot-path indexes incl. `Job(status,createdAt)`, `(clientId)`, `(workerId,status)`, `(expiresAt)` |
| Connection pooling | 🟡 | Prisma pool per-process; **PgBouncer needed at scale** (documented) |
| Not publicly accessible | ❌(deploy) | dev = SQLite file; prod = managed Postgres in private subnet (deploy step) |
| Encryption at rest / in transit | ❌(deploy) | provided by managed Postgres + TLS — **config, not code** |
| Automated backups / PITR / DR / restore tested | ❌ | **not set up; restore not tested** — required gate item |
| Slow-query / query-plan review / load test | ❌ | **not load-tested** |

## D. Authentication & Authorization — ✅ Pass (model-appropriate)
| Item | Status | Evidence |
|---|---|---|
| Password policy / hashing | ⚪ | **passwordless** — phone OTP; no passwords stored |
| MFA/2FA | 🟡 | OTP = single factor (phone possession); **no 2nd factor for admin** — add |
| Session expiration / refresh secured / revocation | ✅ | JWT access (15m) + rotating refresh (DB, revocable); logout revokes |
| Account lockout / OTP brute-force | ✅ | 5-attempt lock + per-phone cooldown + per-IP OTP limiter |
| RBAC / permission matrix / escalation prevented | ✅ | role flags, `adminRequired`, enterprise admin/manager; tested 401/403 |
| Admin actions audited | ✅ | `AuditLog` on verifications/disputes/SoS/DPO |
| Email verification / password reset | ⚪ | no email/passwords in model |
| Device management | ❌ | not implemented (≤5 refresh tokens kept) |

## E. API & Application Security — ✅ Pass (app-level)
| Item | Status | Evidence |
|---|---|---|
| HTTPS / HSTS / CORS | ✅ | Helmet HSTS preload; CORS allow-list; HTTPS enforced at LB (deploy) |
| CSRF | ✅ | token-in-header (not cookies) → CSRF not applicable; no cookie auth |
| XSS | ✅ | React escaping; strict CSP `default-src 'none'` |
| **SQL injection** | ✅ | **100% Prisma, zero raw SQL** — audited |
| SSRF / command injection | ✅ | no shelling out; outbound fetch only to configured adapter URLs |
| Contacts privacy | ✅ | phones masked; revealed **only after accept + signed agreement**; Fayda ID never public |
| Secrets: vault / not in code / not in git / rotation | 🟡 | none in code (grep clean), `.env` git-ignored; **vault + rotation = deploy step** |
| OWASP Top-10 pass | 🟡 | strong on access-control/injection/crypto-config/logging; **no external pen test** |
| Vulnerable-component / dependency / secret scan | ❌ | **no SCA / `npm audit` gate / secret-scanner in CI** |

## F. DevOps & Infrastructure — ❌ Mostly outstanding
| Item | Status | Evidence |
|---|---|---|
| Dockerized + health checks | ✅ | `docker-compose.yml`, non-root, `/health` + `/ready` |
| CI/CD: build/test/scan/deploy/rollback | ❌ | **no pipeline**; tests run locally only |
| IaC / env separation / autoscaling / LB / CDN | ❌ | **not provisioned** (architecture in `SCALING.md`) |
| Container vuln scan / resource limits | ❌ | not done |
| Migrations | 🟡 | `migrate:deploy` scripts exist; dev uses `db push` |

## G. QA & Testing — 🟡 Partial
| Item | Status | Evidence |
|---|---|---|
| Backend unit + API + integration tests | ✅ | **31 tests** (vitest+supertest), isolated seeded DB |
| Frontend unit/component/e2e | ❌ | **none** (no Vitest-RTL / Playwright) |
| Coverage ≥ 80% | ❌ | critical paths covered, **not measured/≥80%** |
| Security: vuln scan / pen test / dep audit / secret scan | ❌ | **not done** |
| Performance: load / stress / scalability / latency (3× traffic) | ❌ | **not load-tested** |

## H. Compliance & Legal — 🟡 Partial
| Item | Status | Evidence |
|---|---|---|
| Privacy Policy / Terms published | 🟡 | in-app `Legal` page + consent ledger; **not counsel-reviewed/published** |
| Ethiopian data protection (Proc. 1321/2024) | 🟡 | consent records + audited DPO access/erasure; **registration pending** |
| GDPR / CCPA | 🟡 | diaspora (EU/US) users → GDPR partial; **self-service export/delete missing** |
| Employment-agency licensing (MoLS) | ❌ | **open legal question** — top blocker for housemaid placement |
| Licenses / IP / OSS audit | 🟡 | MIT-class deps; **no formal OSS license audit** |

---

## Commonly-overlooked items
| Item | Status |
|---|---|
| Remove debug logs | ✅ (1 stray in server) | Remove hardcoded credentials | ✅ none |
| Remove test accounts | 🟡 seed demo users exist; **gate behind `OTP_DEV_MODE=false` + `SEED_ON_START=false`** |
| Verify admin permissions | ✅ | Verify DB indexes | ✅ | Verify audit trails | ✅ |
| Verify rate limiting | ✅ | Verify session invalidation | ✅ | Verify webhook retries | 🟡 HMAC ok, retry idempotent, no DLQ |
| Account deletion flow | ❌ self-service missing (admin DPO erasure only) |
| Export user data flow | 🟡 admin DPO export; **no user-facing export** |
| Failed-payment recovery / refunds | ⚪ payments are off-platform (direct) — no custody |
| Notification-failure handling | ✅ fail-soft + logged | Backup restoration | ❌ not tested |
| Disaster recovery | ❌ | Production secrets rotated | ❌ deploy step |
| Analytics accuracy | ❌ no analytics wired | Accessibility compliance | 🟡 |

---

## Final Launch Gate — ❌ DO NOT DEPLOY (yet)
| Gate criterion | Met? |
|---|---|
| Security scan = Pass · Critical = 0 · High = 0 | ❌ no scan run |
| Test coverage ≥ 80% | ❌ critical-path tests only |
| Backup restore tested | ❌ |
| Load test passed at 3× expected traffic | ❌ |
| Monitoring & alerting operational | 🟡 hooks in code; **collector not provisioned** |
| Rollback deployment tested | ❌ no CD |
| Privacy Policy & Terms published | 🟡 in-app, not counsel-reviewed/published |
| All production secrets rotated/vaulted | ❌ deploy step |

### What must happen before go-live (ordered)
1. **Legal:** MoLS employment-agency determination; counsel-review + publish Terms/Privacy; data-protection registration.
2. **Credentials:** wire Ethio Telecom SMS (login is impossible without it) + Fayda; send a real test OTP.
3. **Infra:** managed Postgres (private, TLS, encryption-at-rest) + PgBouncer; CDN for web; 2+ API pods behind a LB; production secrets in a vault + rotated; `OTP_DEV_MODE=false`, `SEED_ON_START=false`, strong JWT secrets.
4. **Data safety:** automated backups + **a tested restore**; switch to `prisma migrate deploy`.
5. **Pipeline & scanning:** CI running tests + `npm audit`/SCA + secret-scan + container scan; rollback tested.
6. **Resilience:** wire `ERROR_WEBHOOK`/Sentry + metrics (Prometheus/Datadog) + alerts; **load test to 3×**.
7. **Product gaps:** self-service data export + account deletion; admin 2FA; API `/v1`; remove the stray debug log.

**Honest summary:** as an *application*, Serategna is well-built and secure at the code layer (no SQLi, hardened auth, masked contacts, audited admin, 31 passing tests, observability hooks, indexed hot paths). It is **not yet production-deployable** — the blockers are the standard pre-launch **infra, ops, external-integration, and legal** items above, which are a few days of focused work given the architecture is ready.
