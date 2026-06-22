# Serategna — Business & Operating Model (in the product)

Companion to the Master Specification v3.0. The Master Spec governs product/tech;
the Business & Operating Model (`docs/Serategna_Business_Operating_Model.pdf`)
governs commercial/organizational decisions. This note records how that document
is reflected in the running app.

## The model in one line
A marketplace that converts verified, paid informal work into a **portable
financial identity**, then monetizes that identity by selling licensed lenders
the scored, consented data they need to lend to a population they can't currently
reach. Two engines: the marketplace funds the business; the financial-data layer
makes it valuable.

## Customer segments → `accountType`
`User.accountType` ∈ `household | business | sme | diaspora` (Business Model §1.2).
- **household** — default; standard 7%/10% take-rate.
- **business / sme** — **5% take-rate** (Business Model §1.4), set in `lib/ledger.ts`
  `takeRate()` and applied at job confirmation. Switchable in Profile.
- **diaspora** — books for family in Ethiopia (seeded demo: "Ryan").

## Seven revenue streams (phased) — admin → Business tab
| Stream | Phase | In app |
|--------|-------|--------|
| Marketplace take-rate (7% / 10% / 5% business) | 1 | **live** (escrow split) |
| Earned-Wage Access fee (ETB 15) | 2 | roadmap |
| Score licensing / origination (ETB 150–300) | 2 | roadmap (Score live) |
| Equb circle management (ETB 20/mo) | 3 | roadmap |
| Insurance distribution (~15%) | 3 | roadmap |
| Business-account take-rate (5%) | 3 | **live** (account type) |
| Diaspora service fee (ETB 50) | 3 | roadmap |

## Unit economics (verified live in admin → Business)
- Avg job value, **blended effective take-rate** (computes to ~7.2%, matching the doc),
  gross take/job, guarantee reserve/job (1pp), net commission/job, revenue to date.
- Source: `GET /api/admin/business` from the real escrow ledger.

## Phase-1 exit criteria (tracked with progress bars)
Verified paid jobs/worker/week ≥ 2.5 · Active Tier-1 workers ≥ 3,000 · Cumulative
completed jobs ≥ 100,000 · Repeat-pair on-platform share ≥ 60% · Dispute rate < 3%.

## Operating-model alignment (already built)
The doc's core processes map 1:1 to the implementation:
- **P1 Worker onboarding & tiered verification** → `routes/identity.ts`, admin queue
- **P2 Job lifecycle** (post → match → escrow → execute → confirm → payout → rate → dispute) → `routes/jobs.ts`
- **P3 Score computation** (weekly, 4 weighted components, 300–850) → `lib/score.ts`
- **P4 Dispute mediation** (48h SLA, refund/release/split) → `routes/disputes.ts`, admin
- **P5 Leakage detection & response** (repeat-pair watch, 40% target) → admin leakage

## Moat (why the structure matters)
The **no-stored-value, no-lending design is a moat, not a compromise**: a competitor
issuing stored value needs an NBE PII licence; one lending directly needs an MFI
licence. Serategna scales without either while licensing data to those who have them.
This is encoded in the Terms (§2) and the escrow ledger design.

## Three bets (from the doc)
1. Marketplace density in two Addis sub-cities within 12 months.
2. The Serategna Score is predictively valid (Gini > 0.35 on back-test).
3. The regulatory environment stays navigable (proactive NBE engagement).
