# Serategna — Repository Structure

Reference: Master Specification v3.0, Part B3.1 (stack) and B2.3 (Telegram companion).
This is a monorepo so the API, mobile app, admin console, and bot share types, i18n
strings, and the escrow/ledger contract without drift.

```
serategna/
├── apps/
│   ├── mobile/                      # React Native (Expo) — worker/client mode switch
│   │   ├── app/                     # Expo Router screens
│   │   │   ├── (auth)/              # OTP login, language picker
│   │   │   ├── (worker)/            # job feed, earnings, Score, SoS
│   │   │   ├── (client)/            # post job, browse workers, bookings
│   │   │   └── (shared)/            # profile, settings, disputes
│   │   ├── src/
│   │   │   ├── components/          # shared UI primitives
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── jobs/            # posting, feed, lifecycle state machine UI
│   │   │   │   ├── matching/        # geo-radius browse, fair-price band display
│   │   │   │   ├── bidding/         # bid/negotiation thread
│   │   │   │   ├── ledger/          # earnings ledger, withdraw, statements
│   │   │   │   ├── score/           # Score tracker + credit-eligibility projection
│   │   │   │   ├── ratings/
│   │   │   │   ├── disputes/
│   │   │   │   ├── sos/             # panic button, silent trigger, GPS trail
│   │   │   │   ├── verification/    # Tier 0/1/2 flows, doc upload
│   │   │   │   └── family-accounts/ # diaspora booking, recurring jobs
│   │   │   ├── i18n/                # am, om, en locale bundles
│   │   │   ├── lib/
│   │   │   │   ├── api-client/      # typed client for services/api
│   │   │   │   ├── offline-queue/   # SQLite job queue + sync
│   │   │   │   ├── calendar/        # Ethiopian/Gregorian dual calendar
│   │   │   │   ├── push/            # FCM registration
│   │   │   │   └── geo/             # PostGIS-compatible location helpers
│   │   │   ├── store/               # app state (Zustand/Redux)
│   │   │   └── theme/
│   │   ├── assets/
│   │   ├── app.config.ts
│   │   └── package.json
│   │
│   ├── admin-web/                   # React admin console
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── verification-queue/
│   │   │   │   ├── disputes/
│   │   │   │   ├── sos-desk/
│   │   │   │   ├── agents/          # delala onboarding + commission ledger
│   │   │   │   ├── finance/         # ledger ops
│   │   │   │   └── reconciliation/  # daily bank/aggregator reconciliation
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── routes/
│   │   └── package.json
│   │
│   ├── client-web/                  # lightweight client booking page (no app install)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── post-job/
│   │   │   │   ├── browse-workers/
│   │   │   │   └── payment-redirect/  # aggregator checkout return
│   │   │   └── components/
│   │   └── package.json
│   │
│   └── telegram-bot/                # B2.3 — zero-download channel
│       ├── src/
│       │   ├── handlers/            # message/command handlers
│       │   ├── flows/
│       │   │   ├── post-job/
│       │   │   ├── receive-bids/
│       │   │   └── pay-via-aggregator-link/
│       │   ├── i18n/
│       │   └── client.ts            # shares API + ledger with mobile/web
│       └── package.json
│
├── services/
│   └── api/                          # Node.js / Express modular monolith (B3.1)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/             # phone OTP, JWT + refresh rotation
│       │   │   ├── profiles/         # worker_profiles, client_profiles, addresses
│       │   │   ├── jobs/             # posting, lifecycle state machine
│       │   │   ├── matching/         # PostGIS radius + category + rating rank
│       │   │   ├── bidding/          # bids, negotiation threads
│       │   │   ├── ledger/           # double-entry journal — core of Phase 1
│       │   │   ├── payments/
│       │   │   │   └── adapters/     # aggregator adapter pattern (Chapa, ArifPay, ...)
│       │   │   ├── payouts/
│       │   │   ├── ratings/
│       │   │   ├── disputes/
│       │   │   ├── safety/           # SoS: trigger, GPS trail, alert chain
│       │   │   ├── notifications/    # FCM + SMS fallback + Telegram bridge
│       │   │   ├── agents/           # delala onboarding + commissions
│       │   │   ├── verification/     # Tier 0/1/2, MOSIP integration point
│       │   │   ├── score/            # Phase 2 — extracted as own service later
│       │   │   ├── consent/          # Phase 2 — consent ledger, lender API
│       │   │   ├── lending/          # Phase 2 — EWA, nano-loan referral, guarantors
│       │   │   └── equb/             # Phase 3 — digital equb circles
│       │   ├── shared/
│       │   │   ├── db/               # Postgres pool, query helpers
│       │   │   ├── middleware/       # auth, rate-limit, audit-log
│       │   │   ├── config/
│       │   │   └── utils/
│       │   ├── jobs-queue/           # Redis/Bull background workers
│       │   │   ├── reconciliation/
│       │   │   ├── leakage-detection/
│       │   │   └── score-recompute/
│       │   └── app.ts
│       ├── migrations/
│       │   ├── phase1/
│       │   ├── phase2/
│       │   └── phase3/
│       ├── tests/
│       └── package.json
│
├── packages/                         # shared across apps (workspace packages)
│   ├── types/                        # shared TS types (User, Job, LedgerEntry, Score...)
│   ├── i18n-strings/                 # shared am/om/en translation keys
│   └── config/                       # shared lint/tsconfig/env schema
│
├── infra/
│   ├── docker/                       # Dockerfiles + compose for api, admin-web, bot
│   ├── ci/                           # GitHub Actions workflows
│   └── monitoring/                   # Prometheus + Grafana configs
│
├── docs/
│   ├── erd/                          # data model diagrams (next artifact per spec E5)
│   ├── legal/                        # counsel opinions, DPA templates
│   └── agent-onboarding-kit/         # field guide + agreement template
│
└── README.md
```

## Notes on the layout

The `services/api` module boundaries map directly to the spec's domain split (auth,
profiles, jobs, ledger, payments, ratings, disputes, safety, notifications) so the
ledger and, later, the Score engine can be lifted into their own deployable services
at the Phase 2 boundary (C4) without restructuring the codebase — only the import
paths change.

`packages/types` is the contract between the API, mobile app, admin console, and
Telegram bot. The `LedgerEntry`, `Job`, and `Score` shapes should be defined there
first and consumed everywhere else, so a ledger schema change is a single-package
version bump rather than a hunt across four apps.

`migrations/phase1`, `phase2`, `phase3` map onto the sprint roadmap (E2): Phase 1
migrations should be complete by Sprint 4 (escrow ledger), Phase 2 migrations land
during "Phase 2 prep" (Sprints 25–28), Phase 3 during Phase 3 build-out.

The Telegram bot is a thin client over the same API and ledger (B2.3) — it has no
its own data store beyond bot-session state, so a job created via Telegram is
identical in the `jobs` table to one created via the app.
