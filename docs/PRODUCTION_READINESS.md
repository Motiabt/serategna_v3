# Production Readiness — Non-Functional Requirements (NFR) Scorecard

> **Why this doc exists.** Most endpoints work at 1 request. Engineering starts at
> 10,000. The cheapest place to catch "this only works on localhost" is the design
> doc — not a 2 a.m. incident. So every feature PRD must fill in the **NFR section**
> below *before* code, and this scorecard tracks the platform against it.
>
> Legend: ✅ in place · 🟡 partial / single-instance only · ❌ not yet · — N/A

## How this enters a PRD (the guardrail)

Every feature design doc carries a short **NFR block**. If a row can't be answered,
that's a design smell to resolve before building:

```
## Non-Functional Requirements
- Traffic shape:      expected RPS, peak multiplier, burstiness
- Rate limiting:      which limiter tier; per-user vs per-IP
- Validation:         input schema (server-side), output shape
- AuthN / AuthZ:      who can call it; what ownership/role check
- Sync vs async:      what runs inline vs goes to a queue
- External calls:     timeout, retry policy, circuit breaker, idempotency
- Caching:            what's cacheable, TTL, invalidation, shared store?
- Data access:        indexed query paths; unbounded scans?
- Failure mode:       what happens when a dependency is down
- Observability:      logs, metrics, alert thresholds
- Load test:          scenario + target before launch
```

## Platform scorecard (verified this far)

### Traffic & throughput
| Concern | Status | Notes / gap |
|---|---|---|
| Rate limiting (tiered) | ✅ | Global 600 / auth 40 / OTP 20 / **money 15** per 15 min (`app.ts`) |
| Rate-limit store shared across instances | ❌ | `express-rate-limit` default **MemoryStore** — per-process. Move to **Redis store** before running >1 instance, or limits are effectively N× |
| Server-side validation | ✅ | `zod` on every route; integer money (birr), no floats |
| Pagination / bounded queries | 🟡 | `paginate.ts` + `take:` on feeds; admin scans fixed (aggregate/groupBy). Audit remaining `findMany` without `take` |
| Load testing | ❌ | No k6/artillery. Need scenarios for: job feed, login/OTP, advance accept, job confirm |

### Async, resilience & external calls
| Concern | Status | Notes / gap |
|---|---|---|
| Queues / background jobs | ❌ | `notify()`, SMS send, score recompute, advance disbursement all run **inline** in the request. Move to **BullMQ + Redis** (SMS, notifications, score snapshots, payment webhooks) |
| Retries + backoff | ❌ | External calls (SMS provider, payment PSP, Fayda) have no retry/backoff |
| Circuit breakers | ❌ | No breaker on SMS/PSP/Fayda. Add timeout + breaker (e.g. `opossum`) so a slow dep doesn't exhaust the request pool |
| Idempotency | 🟡 | Advance accept is now **atomic** (txn re-check); `mark-paid` carries `txRef`. No generic **Idempotency-Key** middleware on money POSTs yet |
| Graceful shutdown | ✅ | SIGTERM/SIGINT → stop accepting → drain DB pool (`index.ts`) |
| Failure isolation | 🟡 | `notify().catch()` swallows notification failures (good). PSP/SMS failures still inline |

### Data & scaling
| Concern | Status | Notes / gap |
|---|---|---|
| Indexed hot paths | ✅ | Job (6 indexes), Notification `[userId,read]`, Bid `[workerId]`, Advance `[workerId,status]`, Ledger `[ownerId]` |
| In-DB aggregation | ✅ | Admin `/business` uses `aggregate`+`groupBy` (no full-table load) |
| Engine: dev == prod | 🟡 | **SQLite in dev, Postgres in prod** — schema is portable but this divergence caused real drift. Move dev to Postgres |
| Connection pooling | 🟡 | Documented (`prisma.ts`): `connection_limit` + PgBouncer for prod. Not exercised until PG |
| Migrations | 🟡 | Dev uses `prisma db push`; prod must use **`prisma migrate deploy`** (versioned) |
| Backups / PITR | ❓ | Not verified — define Postgres automated backups + point-in-time recovery |

### Horizontal scaling
| Concern | Status | Notes / gap |
|---|---|---|
| Stateless app (JWT) | ✅ | No server-side session; access/refresh tokens. Scales out cleanly |
| Health / readiness probes | ✅ | `/health` (liveness), `/ready` (DB reachable) |
| Shared state externalized | ❌ | **Blockers to N instances:** in-memory rate-limit store, in-memory caches, SQLite. All need Redis/Postgres |
| Caching layer | 🟡 | HTTP `cacheControl` + marketing cache (in-memory). No shared cache → cold/duplicated per instance. Add **Redis** |

### Security
| Concern | Status | Notes / gap |
|---|---|---|
| AuthN | ✅ | Phone OTP + JWT (access/refresh) + optional **TOTP 2FA** for admins; OTP brute-force throttle + attempt counter |
| AuthZ | 🟡 | Per-route ownership/role checks (`req.user.sub === resource.ownerId`). Correct but **ad-hoc** — centralize into policy helpers; consider Postgres **Row-Level Security** as defense-in-depth |
| Server-side validation | ✅ | `zod` everywhere; never trust client (advance limit recomputed server-side, not taken from request) |
| Secrets / API keys | ✅ | env + `.gitignore`d; **fail-fast** on weak/`dev-` secrets in prod; partner keys HMAC-hashed. (Past leak: committed `dev.db.backup` — untracked + ignore hardened) |
| PII minimization | ✅ | Prisma **global omit** of `totpSecret`/`faydaNumber` — can't leak even from a raw row read |
| Transport / headers | ✅ | Helmet (locked CSP, HSTS, no-referrer), CORS allowlist, `x-powered-by` off, 256 kb body cap |
| Injection | ✅ | Prisma parameterizes; no raw interpolated SQL |
| Secret scanning in CI | ✅ | gitleaks job in `ci.yml` |

### Observability
| Concern | Status | Notes / gap |
|---|---|---|
| Structured logs + request IDs | ✅ | `logger` + `x-request-id` correlation + morgan access logs |
| Audit trail | ✅ | `AuditLog` for sensitive actions |
| Metrics | ❌ | No Prometheus/OpenTelemetry counters/histograms (RPS, latency, error rate, queue depth) |
| Distributed tracing | ❌ | None |
| Error tracking | ❌ | No Sentry/equivalent |
| Alerting / SLOs | ❌ | No alert thresholds defined (error rate, p99 latency, 429 spikes, DB pool saturation) |

## Top gaps, in priority order

1. **Redis** — unlocks three things at once: shared rate-limit store, shared cache, and a job queue. Single highest-leverage infra add for horizontal scale.
2. **Postgres in dev** — kills the engine divergence; required before pooling/RLS mean anything.
3. **Queue the side-effects** — SMS, notifications, score snapshots, payment webhooks off the request path (BullMQ).
4. **Resilience on external deps** — timeout + retry + circuit breaker + Idempotency-Key on PSP/SMS/Fayda.
5. **Observability** — metrics + error tracking + 4–5 alert SLOs before pilot scale.
6. **Load test** — k6 on the five hot paths; set pass thresholds in CI.

> Related deep-dives: [SCALING.md](SCALING.md) · [SECURITY.md](SECURITY.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [READINESS.md](READINESS.md)
