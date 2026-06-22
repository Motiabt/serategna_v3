# Serategna — Architecture & Decisions

This implementation is **Phase 1 (The Marketplace)** of Master Specification v3.0 —
the part the spec says "carries the weight," because the business dies in months 0–12
if work leaves the platform for cash. Every feature here exists to keep the
transaction (and therefore the escrow ledger and the Score) on-platform.

## What is built

| Spec area | Status |
|-----------|--------|
| Two-sided marketplace (worker/client mode switch, B2.1) | ✅ |
| Phone-OTP auth, JWT + single-use refresh rotation (E1) | ✅ |
| Job lifecycle state machine: open→accepted→enroute→started→completed→confirmed (B2.1) | ✅ |
| Bids + in-app negotiation thread (B2.1) | ✅ |
| **Escrow double-entry ledger** funded→held→released→paid_out + refund branch (B3.2) | ✅ |
| Daily automated reconciliation endpoint (B3.2) | ✅ |
| Tiered Fayda identity: Tier 0 caps, escrowed payout gate, Tier 1 unlock (B2.2) | ✅ |
| Serategna Score v2.0 — 4 weighted components, live, with credit projection (C3.1) | ✅ |
| Two-way ratings, disputes with mediator resolution moving escrow (B2.1) | ✅ |
| SoS safety: panic + silent trigger, GPS trail, alert chain, admin desk (B2.1/E1) | ✅ |
| Fair-price guidance bands per category × sub-city (B2.1) | ✅ |
| Payment aggregator **adapter pattern** (Chapa-class swap = config) (B3.4) | ✅ |
| Notifications fan-out: push + SMS fallback + Telegram bridge (B3.1) | ✅ stub |
| Admin console: KPIs, verification queue, disputes, SoS, reconciliation, leakage (B5) | ✅ |
| Trilingual AM / OM / EN + dual Gregorian/Ethiopian calendar (A2) | ✅ |
| Security baseline: helmet, rate-limit, CORS allowlist, prod secret guard, payout cap (E1) | ✅ |

Phase 2 (Score licensing, EWA, nano-loans, consent ledger) and Phase 3 (equb,
insurance, diaspora) are out of scope but the module boundaries leave room for them.

## Stack

- **API** — Node 22 + Express (modular monolith). Route modules map 1:1 to the
  spec's domain split (`auth, profiles, jobs, ledger/wallet, ratings, disputes,
  sos, score, catalog, identity, admin`) so the ledger and Score engine can be
  lifted into their own services at the Phase 2 boundary (C4) without restructuring.
- **DB** — Prisma ORM. Default **SQLite** for zero-config local dev; **PostgreSQL 16**
  in Docker/production (the build flips the datasource via `scripts/use-postgres.mjs`).
  All queries are engine-agnostic and geo-matching uses Haversine in app code, so
  no PostGIS dependency is required to run — see `docs/db/serategna-schema-phase1.sql`
  for the canonical Postgres + PostGIS DDL the production DBA can adopt.
- **Web** — React 18 + Vite + TypeScript + Tailwind. Mobile-first, rendered in a
  phone frame on desktop; the same app serves worker, client and admin surfaces.

## The escrow ledger (the heart, B3.2)

`ledger_entries` is an **append-only double-entry journal**. Every row is one
balanced movement (`amount` debited from `debitAccount`, credited to
`creditAccount`). Nothing is ever updated or deleted — corrections are new rows
referencing `correctsId`. Account balances are derived (`credits − debits`).

Money lifecycle of a job:

```
fund    : BANK_ESCROW            → CLIENT_ESCROW(job)         (client pays in)
confirm : CLIENT_ESCROW(job)     → WORKER_PAYABLE(worker)     (worker net, 1−takeRate)
          CLIENT_ESCROW(job)     → PLATFORM_COMMISSION        (takeRate − reserve)
          CLIENT_ESCROW(job)     → GUARANTEE_RESERVE          (1% reserve)
payout  : WORKER_PAYABLE(worker) → BANK_ESCROW                (withdraw to own account)
refund  : CLIENT_ESCROW(job)     → BANK_ESCROW                (upheld dispute)
```

The journal nets to zero at all times — `GET /api/admin/reconciliation` proves it.
This is simultaneously the **compliance artifact** (no stored value: every credit
is owed money, withdrawable on demand) and the **Score's raw material**.

## Why not the full apps/ + services/ + packages/ monorepo yet?

`docs/architecture/target-monorepo-structure.md` is the target layout (mobile app,
admin-web, client-web, telegram-bot, services/api, shared packages). This build
ships the **functional, deployable core** — one API + one web client + the ledger —
rather than four scaffolded-but-empty app shells. The API module boundaries already
match `services/api/modules`, so splitting the web surfaces and adding the Expo app
and Telegram bot is additive, not a rewrite.
