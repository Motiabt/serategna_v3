<div align="center">

# ሰራተኛ · Serategna

**The work-to-credit operating system for Ethiopia's real economy.**
Phase 1 — The Marketplace · Master Specification v3.0

Work · Build credit · Thrive

</div>

---

Serategna converts verified, paid informal work into a portable financial identity.
This repo is a **deployment-ready full-stack implementation of Phase 1**: a two-sided
marketplace whose escrow ledger and Serategna Score are built from job one, so the
proprietary earnings dataset (the asset Phase 2 monetizes) accrues from launch.

- 🧱 **Backend** — Node + Express + Prisma, append-only **double-entry escrow ledger**
- 📱 **Frontend** — React + Vite + Tailwind, mobile-first, Apple SF font, trilingual (AM/OM/EN)
- 💼 **Every kind of work** — gigs, short-run/daily, fixed-term contracts, permanent placement, and group hire; formal & informal
- 🤖 **AI tools** — AI CV builder for workers, AI job-posting assistant for employers
- ✍️ **Digital contracts** — auto-generated, OTP-signed agreements (Proclamation 1205/2020) + amount-capped **guarantors**
- 🛡️ **Safety & trust** — SoS, tiered Fayda identity, disputes, two-way ratings
- 🏠 **Housemaid-first (the delala fix)** — a front-and-center "Hire a trusted housemaid" flow: **no broker fee**, vetted & **guarantor (ዋስ) mandatory**, fair guaranteed wage, ETB 100/mo · up to 4 posts/year
- 💵 **Minimum wage on every job** — gigs, daily, and permanent all enforce a floor (server-side, on post *and* bid) to end underpayment
- 🎓 **Verifiable certifications** — workers add institution certificates; admins verify; boosts Score & trust badges
- 🧠 **Psychometric reliability** — a short onboarding assessment (conscientiousness/integrity/punctuality) feeds the Score & matching
- 🤝 **Consensus, not contract** — in-app agreement records mutual consensus; the binding legal contract is signed **in person** (printable)
- 🏛️ **Informal-sector first** — domestic permanent-contract form (live-in, duties, day-off, guarantor), living-wage floor, anti-*delala* transparency
- 💸 **Direct pay, never held** — Serategna **never holds money**; employer pays the worker directly (Telebirr/CBE/cash), worker keeps **100%**, funded by a flat **employer subscription** (ETB 100/mo or 1000/yr, 5 posts/mo)
- 🎯 **80% skill-match gate** — workers only see/apply to jobs (and clients only see workers) at ≥80% relevance; workers get 5 applications/month
- 🔁 **Engagement lifecycle** — hired → worker goes *busy* → work → employer marks paid → worker finalizes → free again; live taxi-style tracking + ETA throughout
- ⚖️ **ye-sera wastina (የስራ ዋስ)** — Ethiopian legal work-guarantor surety; signable agreement
- ⚖️ **Compliant by design** — no stored value/wallet, no held funds → **no NBE Payment Instrument Issuer licence required**; Terms, Privacy & consent ledger built in
- 🌍 **Trilingual job taxonomy** — 20 groups · 270+ roles in English, Amharic (Ge'ez + transliteration) & Afaan Oromoo (Qubee), with work-type tags [F][I][G][S] — powers categories, search, filters & CV
- 🪪 **Verified Income Passport** — a shareable public profile (link + QR, no login) proving a worker's verified jobs, income, Score, badges & ratings — the portable financial identity made real
- 🏅 **Reputation badges** — Fayda-verified · Top rated · Reliable · Experienced · Rising · Elite, derived from real data
- 🔎 **Transparent matching** — every match shows *why* (skill, proximity, score, rating, verified); algorithms documented in `docs/ALGORITHM.md`
- 🛡️ **Hardened security** — OTP brute-force lock + throttle, strict CSP/HSTS, tamper-evident audit log, no funds custody (see `docs/SECURITY.md`)
- 🌓 **Light & dark themes** — one tap (moon/sun in the header, or Profile → Appearance); persists, adapts every surface
- 🔔 **Toasts & skeletons** — instant feedback and snappy perceived performance
- 🃏 **Swipe decks both ways** — clients swipe to **shortlist workers** (persisted) · workers swipe to **quick-bid jobs** (one-tap sheet) or bookmark them; lime hero card on charcoal, Swipe/List & Cards/Map toggles
- 🧭 **Interlinked matching** — one relevance algorithm ranks jobs for workers *and* workers for clients (role/category fit · proximity · score · rating · verification · freshness)
- 📄 **AI CV import** (paste/upload → auto-fills skills & specializations) and **business-license import** (→ company profile)
- 🔔 **Notifications & reminders** — in-app feed, unread badge, event + due-date reminders
- 🔒 **Confidential by default** — phone numbers masked unless you own them, are admin, or are an engaged counterparty on an active job
- 🗺️ **Google Maps** — pin-drop location picker on posting (workers & clients), job-location & worker maps, workers-on-map browse (styled fallback when no API key)
- 🔌 **Integrations** — payment aggregator adapter (mock/**Chapa**) + HMAC webhook, SMS/FCM/Telegram, Fayda/MOSIP — all behind swappable seams with an admin status panel
- 📊 **Admin console** — verification queue, disputes, SoS desk, reconciliation, KPIs, integrations
- 🚢 **Deploy** — Docker Compose (Postgres + API + web), GitHub Actions CI

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/SECURITY.md`](docs/SECURITY.md).

## Repository layout

```
serategna-v3/
├── server/          # Express API + Prisma (escrow ledger, jobs, score, safety)
│   ├── src/
│   │   ├── routes/      # auth, profiles, jobs, wallet, score, ratings, disputes, sos, identity, catalog, admin
│   │   ├── lib/         # ledger · score · payments adapter · notifications · geo · catalog · jwt
│   │   └── middleware/
│   └── prisma/          # schema + seed
├── web/             # React app (worker + client + admin in one bundle)
│   └── src/{pages,components,lib}
├── docs/            # architecture, security, canonical Postgres+PostGIS DDL, spec PDF
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Quick start (local dev, zero external services)

The API uses SQLite by default — **no database to install**. Requires Node.js 20+.

### Option A — one command (recommended)
From the `serategna-v3/` folder:
```bash
npm run first-run      # installs everything, sets up the DB, starts API + Web
```
On Windows you can instead double-click **`START.bat`**.
Then open http://localhost:5173.

> In VS Code: open the `serategna-v3` folder, then **Terminal → Run Task… → Run all (API + Web)**.

### Option B — two terminals (manual)

**1 — API** (http://localhost:4000)
```bash
cd server
npm install
npm run setup     # prisma generate + db push + seed demo data
npm run dev
```

**2 — Web** (http://localhost:5173)
```bash
cd web
npm install
npm run dev       # proxies /api → :4000
```

Open http://localhost:5173 and tap a **demo account** on the login screen
(OTP is auto-filled in dev mode):

| Role | Phone |
|------|-------|
| Client (Janani) | `+251922000001` |
| Worker · Tier 1 (Hanna) | `+251911000001` |
| Worker · Tier 0 (Meron) | `+251911000007` |
| Admin / Ops | `+251900000000` |

## Try the full loop

1. As **Janani** (client) → Post a job → it appears in the worker feed.
2. As **Hanna** (worker, switch "Work" mode) → open the job → place a bid.
3. As Janani → accept the bid → **Fund escrow** (routed through the payment adapter).
4. As Hanna → I'm on my way → Start → Mark complete.
5. As Janani → **Confirm & release** → escrow splits into worker net / commission /
   1% guarantee reserve; Hanna's Score updates; she can withdraw (Tier 1).
6. As **Admin** → Dashboard shows KPIs and the ledger reconciling to **variance 0**.

## Deploy with Docker

```bash
cp .env.example .env          # set strong JWT secrets + DB password
docker compose up --build     # Postgres + API + web
# → web on http://localhost:8080 , API proxied at /api
```

The API container targets PostgreSQL, applies the schema (`prisma db push`),
optionally seeds (`SEED_ON_START`), and runs as a non-root user. Set
`SEED_ON_START=false` and `OTP_DEV_MODE=false` for a clean, secure production DB.

## Environment

- `server/.env.example` — API config (DB, JWT, economics, OTP, payout cap).
- `.env.example` (root) — Docker Compose config.

## Mapping to the specification

| Spec | Where |
|------|-------|
| B3.2 escrow double-entry ledger | `server/src/lib/ledger.ts`, `routes/jobs.ts`, `routes/wallet.ts` |
| B2.2 tiered Fayda identity | `routes/identity.ts`, Tier-0 caps in `routes/jobs.ts` |
| C3.1 Serategna Score v2.0 | `server/src/lib/score.ts`, `routes/score.ts` |
| B3.4 payment rail adapter | `server/src/lib/payments.ts` |
| B2.1 SoS safety | `routes/sos.ts`, `web/src/components/SafetyButton.tsx` |
| B5 KPIs + reconciliation | `routes/admin.ts`, `web/src/pages/Admin.tsx` |
| E1 security baseline | `docs/SECURITY.md`, `src/config.ts`, `src/middleware/` |
| Employment taxonomy (gig→permanent, group hire) | `lib/employment.ts`, `routes/jobs.ts`, `web/src/pages/PostJob.tsx` |
| AI CV + AI job-posting assistant | `lib/ai.ts`, `routes/ai.ts`, `web/src/pages/Cv.tsx` |
| Digital contracts + OTP e-signature (1205/2020) | `lib/contracts.ts`, `routes/contracts.ts`, `web/src/pages/ContractDetail.tsx` |
| Guarantors / suretyship (1243/2021) | `routes/guarantors.ts`, `web/src/pages/Guarantors.tsx` |
| Terms, Privacy & consent ledger (1321/2024) | `lib/legal.ts`, `routes/legal.ts`, `web/src/pages/Legal.tsx` |
| No-PI-licence (no stored value) | `docs/SECURITY.md`, Terms §2, escrow ledger design |
| Account types + business 5% take-rate (Business Model §1.4) | `lib/ledger.ts`, `routes/auth.ts`, `web/src/pages/Profile.tsx` |
| Business KPIs · unit economics · exit criteria · revenue roadmap | `routes/admin.ts` (`/business`), `web/src/pages/Admin.tsx`, `docs/BUSINESS.md` |

---

Prepared for **Mo Creatives** · Addis Ababa · Confidential.
