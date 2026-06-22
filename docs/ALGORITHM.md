# Serategna — Algorithms (transparent & objective)

Both ranking algorithms are deterministic, auditable, and explained to users in
the app. No black boxes, no randomness.

## 1. Match score (worker ↔ job), 0–100

One formula ranks **jobs for a worker** and **workers for a client** so the
experience is symmetric. Source: `server/src/lib/matching.ts`.

```
fit      = roleMatch ? 75 : categoryMatch ? 68 : 12     # SKILL is the spine
quality  = ( proximity*0.35 + score*0.30 + rating*0.20
           + verified*0.10  + freshness*0.05 ) * 25      # 0–25 refinement
match    = clamp(0..100, fit + quality)
if not available: match *= 0.6                            # engaged → drops out
```

- **Skill-first by design:** a relevant category/role match clears the **80%
  gate** on its own; proximity/score/rating only re-order within. An irrelevant
  worker can never reach 80 — so the "≥80% only" rule means *relevant*, not
  *nearby*.
- **Explainability:** `matchReasons()` returns the exact reasons ("Exact
  specialization", "Nearby", "Elite score", "Top rated", "Fayda-verified",
  "Currently engaged") shown in the app as "why this rank".
- Inputs are all observable platform facts — no opaque inputs.

## 2. Serategna Score (worker creditworthiness), 300–850

Source: `server/src/lib/score.ts`. Four weighted components (Master Spec C3.1):

| Component | Weight | Built from |
|-----------|-------:|------------|
| Transaction integrity | 35% | confirmed jobs vs disputes |
| Earnings consistency | 30% | spread + volume of confirmed earnings |
| Platform behavior | 20% | completion rate + average rating |
| Relationship capital | 15% | vouched-by + verification tier |

```
score = 300 + (Σ componentᵢ · weightᵢ) · 550   → clamped to 300–850
```

- Returned to the worker with the per-component breakdown (`/api/score/me`) and a
  credit-eligibility projection — the worker always sees *why*.
- Snapshotted on each finalize (`score_history`) so a score can be reproduced
  at a point in time for an MFI (immutable audit basis for back-testing).

## 3. Reputation badges

`server/src/lib/badges.ts` — purely derived thresholds (Fayda-verified, Top
rated ≥4.8★/5 jobs, Reliable ≥95% completion, Experienced ≥20 jobs, Rising,
Elite ≥740). Deterministic and inspectable.

## Why this matters
Lenders, auditors and workers can all reproduce every number from the same
public rules and the append-only ledger. Trust comes from transparency, not from
a proprietary black box.
