# Serategna — Build Journal

How this app was built: the journey, the decisions, the tools, and how the code
is organised. Read alongside `ARCHITECTURE.md` (system design), `ALGORITHM.md`
(matching/score), `SECURITY.md`, `BUSINESS.md`, and `PILOT.md` (go-live runbook).

---

## 1. What Serategna is

A two-sided, work-to-credit marketplace for Ethiopia's informal economy
(housemaid-first). Households/businesses post jobs; vetted workers are matched,
hired, tracked live, and paid **directly** (the platform never holds money).
Every completed job builds a worker's **Serategna Score** and a portable
**Verified Income Passport**. Revenue is a flat employer subscription — no broker
cut, which also keeps it outside NBE Payment-Instrument-Issuer licensing.

---

## 2. The build journey (chronological)

1. **Spec → scaffold.** Built a monorepo from the Master Spec v3.0: Express+Prisma
   API, React+Vite web app, shared docs. Seeded a trilingual job taxonomy.
2. **UI iterations.** Cycled through design references and landed on a Deep-Trust
   Navy + electric-cyan fintech system; later differentiated employer (indigo) vs
   worker (cyan) accents, added light/dark theming, toasts, skeletons.
3. **Domain depth.** Added every employment type (gig → permanent, group hire,
   formal/informal), guarantors (ዋስ), digital contracts, certifications, a
   psychometric assessment, the SoS safety desk, and the Verified Income Passport.
4. **Model pivots (driven by the founder's constraints).**
   - *No held funds* → removed escrow custody; switched to **direct off-platform
     pay** + a flat **employer subscription** (ETB 100/mo or 1000/yr).
   - *Relevance* → a hard **80% skill-match gate** in both directions.
   - *Anti-exploitation* → a server-enforced **living-wage floor** on every job.
   - *Housemaid-first* → a dedicated permanent-maid flow, guarantor mandatory.
5. **UX polish.** Rebuilt discovery as an Uber/dating-app **swipe deck** (drag
   stamps, spring physics, rewind), live taxi-style tracking, geometric heavy
   type (SF Pro Display / Sora).
6. **Enterprises + growth.** Enterprise packages, lead capture, a call centre, a
   standalone marketing landing page, and an admin DPO data-access tool.
7. **Hardening (security pass).** OTP brute-force lockout + throttle, JWT access +
   rotating refresh, strict Helmet CSP/HSTS, phone masking, audit log, and a full
   **pagination cap** on every list endpoint. Confirmed **no SQL-injection
   surface** (100% Prisma + Zod, zero raw SQL).
8. **Pilot-readiness (final pass).**
   - **Real OTP/SMS delivery** behind a provider seam — now wired for
     **Ethio Telecom** (bulk SMS) with `http`/`twilio` alternates and a console
     dev fallback; Ethiopian numbers auto-normalised to `2519XXXXXXXX`.
   - **Observability**: structured JSON logging, per-request `x-request-id`,
     `/health` + `/ready` (DB check), and a 500-error capture hook.
   - **Automated test suite**: 31 tests (unit + integration) with an isolated
     seeded test DB. The suite immediately caught and we fixed two real bugs
     (pagination clamp; refresh-token collision on rapid re-login).
   - **Honesty**: rebranded the rule-based "AI" features to "Smart".
   - **Migrations + backup procedure**, expanded `.env.example`, and `PILOT.md`.

> Note: mid-build the project folder was reorganised into
> `Mo Creatives\Serategna Project\serategna-v3` — that is the canonical path.

---

## 3. Tools & technology used

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** end-to-end | one language, type safety across the stack |
| API | **Node.js + Express** | simple, ubiquitous, easy to hire for in-region |
| ORM / DB | **Prisma**; **SQLite** dev → **PostgreSQL** prod | zero-config local dev, robust prod |
| Validation | **Zod** | every request body/query parsed → no mass-assignment / injection |
| Auth | **JWT** (access + rotating refresh) + phone **OTP** | passwordless, SIM-based |
| Security | **Helmet** (CSP/HSTS), **express-rate-limit** | hardened transport + throttling |
| Web | **React 18 + Vite + React Router + Tailwind** | fast, mobile-first |
| Mobile | **Expo / React Native** (WebView wrapper) | quick path to a native shell |
| SMS | **Ethio Telecom** bulk SMS (seam: http/twilio/console) | local carrier reach |
| Tests | **Vitest + Supertest** | unit + HTTP integration |
| Observability | structured logger + `ERROR_WEBHOOK` seam | drains to any APM |
| Infra | **Docker / docker-compose** | reproducible deploy |
| Tooling | tsx, nanoid, dotenv, morgan | dev runtime, ids, env, logs |

There is **no Python** anywhere; the stack is entirely the Node/TypeScript ecosystem.

---

## 4. How the code is organised

```
serategna-v3/
├── server/                      Express + Prisma API (TypeScript)
│   ├── src/
│   │   ├── app.ts               builds & exports the Express app (mounts, middleware)
│   │   ├── index.ts             entrypoint — listens (imports app.ts)
│   │   ├── config.ts            env config + prod safety checks
│   │   ├── middleware/
│   │   │   ├── auth.ts          authRequired / adminRequired / ah() / HttpError
│   │   │   └── error.ts         central error handler (+ captureError hook)
│   │   ├── lib/                 business logic (pure where possible)
│   │   │   ├── matching.ts      skill-first match score + reasons (80% gate)
│   │   │   ├── score.ts         Serategna Score (300–850, 4 components)
│   │   │   ├── wage.ts          living-wage floors + fee breakdown
│   │   │   ├── subscription.ts  plans, post/apply quotas, MATCH_THRESHOLD
│   │   │   ├── paginate.ts      pageParams() — clamps every list query
│   │   │   ├── sms.ts           SMS seam (ethiotelecom / http / twilio / console)
│   │   │   ├── logger.ts        structured logging + captureError
│   │   │   ├── psychometric.ts  reliability assessment scoring
│   │   │   ├── badges.ts geo.ts jwt.ts privacy.ts ledger.ts escrow.ts
│   │   │   ├── catalog.ts taxonomy.ts employment.ts enterprise.ts
│   │   │   ├── contracts.ts legal.ts audit.ts notifications.ts ai.ts prisma.ts
│   │   │   └── core.test.ts     unit tests for the pure libs
│   │   └── routes/              23 route groups (auth, jobs, profiles, score,
│   │                            wallet, disputes, sos, identity, catalog, ai,
│   │                            contracts, guarantors, legal, payments,
│   │                            integrations, notifications, saved,
│   │                            subscription, public, credentials, enterprise,
│   │                            ratings, admin)
│   ├── prisma/
│   │   ├── schema.prisma        29 models (the data model)
│   │   └── seed.ts              demo users, taxonomy, price bands
│   ├── scripts/
│   │   ├── test-db.mjs          provisions the isolated test DB
│   │   ├── send-test-sms.mjs    `npm run sms:test` — verify SMS delivery
│   │   └── use-postgres.mjs     flips Prisma provider sqlite→postgres for prod
│   ├── test/api.test.ts         HTTP integration tests (supertest)
│   ├── vitest.config.ts
│   └── .env.example
├── web/                         React + Vite app (worker + client + admin)
│   └── src/
│       ├── App.tsx main.tsx index.css
│       ├── pages/               24 screens (Home, Jobs, Browse, PostJob, Score,
│       │                        Wallet, Profile, Admin, Landing, Enterprises, …)
│       ├── components/          Shell, SwipeDeck, MapView, Badges, ui, icons …
│       └── lib/                 api, auth, theme, toast, i18n, format
├── mobile/                      Expo / React Native WebView shell (App.tsx)
├── docs/                        ARCHITECTURE · ALGORITHM · SECURITY · BUSINESS ·
│                                PILOT · this journal · SQL schema · spec PDFs
├── docker-compose.yml           Postgres + API + web
├── START.bat                    one-click local run (Windows)
└── README.md
```

**Design principles in the layout**
- **Rules live server-side** (`lib/` + `routes/`), not in the UI — wage floor, the
  80% gate, quotas and phone-masking are all enforced in the API.
- **Pure logic is isolated** in `lib/` so it's unit-testable without a DB.
- **External services sit behind seams** (`sms.ts`, `payments.ts`, integrations)
  with safe fallbacks, so the app runs with zero credentials in dev.
- **One web bundle, three audiences** via a role switch + separate admin console.

---

## 5. How to run & test (quick reference)

```bash
# install everything + set up the dev DB, then run API + Web
npm run first-run                 # from repo root  (or double-click START.bat)
# open http://localhost:5173

# backend only
cd server && npm run setup && npm run dev      # API on :4000
cd web && npm run dev                          # web on :5173 (proxies /api)

# tests
cd server && npm test             # 31 tests, isolated seeded test DB
cd server && npm run sms:test -- +2519XXXXXXXX "hi"   # live SMS check
```

Demo logins (dev OTP auto-returned): client `+251922000001`, worker
`+251911000001`, admin `+251900000000`.
