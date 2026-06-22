# Serategna — Scaling to 500k Concurrent Users

This describes how Serategna scales to **~500,000 concurrent live users**. The
application is already built **stateless and horizontally scalable**; reaching
500k concurrent is then an *infrastructure* exercise (run more copies behind a
load balancer) plus the data-tier work below. Honest split: what's done in code
vs. what must be provisioned/refactored.

---

## 1. What the code already does right (scale-ready by design)

- **Stateless API.** Auth is JWT (access + rotating refresh) with **no server
  session** — any request can hit any instance, so the API scales horizontally
  by just running more copies. `app.set('trust proxy', 1)` keeps client IPs
  correct behind a load balancer.
- **Bounded queries everywhere.** Every list endpoint is clamped
  (`pageParams`, `MAX_PAGE=100`, candidate scans `MAX_SCAN=300`) — no request can
  ask the DB for an unbounded result set.
- **Liveness/readiness probes** (`/health`, `/ready`) for the load balancer and
  autoscaler; `/ready` checks DB connectivity.
- **Hot-path indexes** on `Job(status,createdAt)`, `Job(clientId)`,
  `Job(workerId,status)`, `Job(expiresAt)`, plus existing indexes on bids,
  ledger, ratings, notifications, OTP, contracts, enterprise members.
- **No heavy payloads in lists.** Company logos (base64) are stripped from feed
  responses and sent only on the detail view (see §4 for the production fix).
- **No funds custody** → no financial-ledger hot lock to serialize on.

## 2. Target architecture for 500k concurrent

```
                         ┌────────── CDN (web app + static, edge cache) ──────────┐
   500k clients ──TLS──►│  Global LB / WAF / TLS termination                       │
                         └───────────────┬─────────────────────────────────────────┘
                                         │  (sticky-less, round-robin)
                         ┌───────────────▼───────────────┐
                         │  API tier — N stateless pods   │  autoscale on CPU/RPS
                         │  (Node/Express, this app)      │  ~ 40–80 pods @ 500k
                         └──────┬───────────────┬─────────┘
            ┌───────────────────┘               └───────────────────┐
   ┌────────▼─────────┐                                   ┌──────────▼──────────┐
   │ Redis cluster    │  cache · rate-limit · pub/sub     │ PgBouncer (poolers) │
   │ sessions/n-a     │  for realtime fan-out             └──────────┬──────────┘
   └──────────────────┘                                   ┌──────────▼──────────┐
   ┌──────────────────┐   ┌─────────────────────────┐     │ PostgreSQL primary  │ writes
   │ Object storage   │   │ Queue (SMS/notifs/score)│◄────┤  + N read replicas  │ reads
   │ (logos, proofs)  │   │ workers (BullMQ/SQS)    │     └─────────────────────┘
   └──────────────────┘   └─────────────────────────┘
```

**Capacity math (rule-of-thumb).** 500k concurrent users ≠ 500k requests/sec.
Active users poll/act a few times per minute → ~5k–25k RPS. A single Node pod
serves ~300–800 RPS comfortably (I/O-bound) → **~40–80 API pods**. The bottleneck
is the database, addressed below.

## 3. Data tier (the real bottleneck)

- **Managed PostgreSQL**, vertically sized primary for writes; **read replicas**
  for the read-heavy surfaces (feed, browse, passport, score).
- **PgBouncer** connection pooling — Node + Prisma open many connections; pool
  them so 80 pods don't exhaust Postgres `max_connections`. Set Prisma
  `connection_limit` low per pod and let PgBouncer fan in.
- **Redis** for: response cache (catalog, price bands, enterprise overview — all
  near-static), **distributed rate-limiting** (replace the in-memory limiter
  store so limits are global, not per-pod), and **pub/sub** to fan out realtime.
- **Queue** (BullMQ on Redis, or SQS) for SMS (Ethio Telecom), notifications,
  and score recomputation — so request latency never waits on a third party.

## 4. Required refactors before 500k (tracked, not yet done)

| Area | Now | At scale |
|---|---|---|
| Company logos / wage-proof images | base64 in DB (dev) | **object storage + CDN URLs**; DB stores only the URL |
| Geo matching | in-memory rank over a 300-row scan | **PostGIS** `GIST` index + DB-side distance/KNN; or a search service |
| Rate limiting | in-memory (per-pod) | **Redis store** (`rate-limit-redis`) for global limits |
| Realtime (chat, tracking) | client polling | **WebSocket/SSE** with Redis pub/sub fan-out |
| Score recompute | on-request | **async via queue**, cached snapshot read-path |
| Sessions/OTP | DB rows | OTP in **Redis with TTL**; refresh-token denylist in Redis |
| DB migrations | `db push` (dev) | `prisma migrate deploy` + zero-downtime, expand/contract |

## 5. Web tier

- The React app is **static** → serve from a **CDN** (edge-cached globally);
  near-infinite read scale, no origin load. Vite now honours `PORT` for any host.
- API calls are same-origin via the edge/proxy, so CORS stays simple.

## 6. Resilience & cost controls

- **Autoscaling** API pods on RPS/CPU; scale replicas on read load.
- **Circuit breakers + timeouts** on SMS/identity adapters (already behind
  swappable seams with fallbacks).
- **Backpressure**: the bounded queries + rate limits protect the DB during spikes.
- **Observability** (already): structured logs + `x-request-id` + `ERROR_WEBHOOK`
  → ship to an APM; alert on p99 latency, 5xx, replica lag, pool saturation.
- **Load test** before launch (k6/Gatling) to the target RPS and tune pod count.

## 7. Bottom line

The app is **architected to scale horizontally today**. To actually host 500k
concurrent you (a) run the web on a CDN, (b) run 40–80 stateless API pods behind
a load balancer with autoscaling, (c) put PgBouncer + read replicas + Redis in
front of Postgres, and (d) complete the §4 refactors (object storage for media,
PostGIS for geo, Redis-backed rate-limit, WebSocket realtime). None of these
require rewriting the product — they're infrastructure and four contained code
changes.
