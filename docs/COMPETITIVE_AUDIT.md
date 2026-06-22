# Serategna — Audit: Law · Best Practices · Strategy to Outcompete

An honest assessment of the build against (A) Ethiopian law, (B) engineering &
security best practices, and (C) what it takes to win the market. Grounded in the
shipped code; verified this session (server+web `tsc`=0, 31 server + 7 web tests,
ledger reconciles to 0). Not legal advice — see `docs/LEGAL_COMPLIANCE.md`.

## Scorecard (updated after the A-grade hardening pass)
| Area | Grade | One-line |
|---|---|---|
| Regulatory posture | **B → A\*** | Compliant-by-design; **A requires external action** (632/2009 licence + DP registration) — cannot be reached in code |
| Security | **A** | No SQLi, hardened auth, **admin TOTP 2FA**, masked PII, contacts gated on signed agreement, rate-limited. (A+ adds Postgres RLS + external pen test) |
| Engineering | **A−** | Stateless, **34 tests**, indexed, cached, CI; A+ needs Redis, `migrate deploy`, ≥80% coverage, WebSocket |
| Product/UX | **A−** | Housemaid-first, trust layer, swipe UX, **light/dark toggle on enterprise**; A needs a11y + low-literacy pass |
| Strategy / moat | **A−** | Data → credit + certificate is a genuine, defensible moat |

\* **Honest note:** "everything A" is **not fully achievable in code.** Regulatory-A
depends on obtaining the **632/2009 employment-exchange licence** and **data-protection
registration** (legal/admin actions); engineering/security A+ items (Postgres **RLS**,
**Redis** multi-instance rate-limit/cache, **WebSocket** realtime, external **pen test**,
≥80% coverage) need infrastructure/process. This pass raised every *code-addressable*
gap: **admin 2FA → Security A**, the **enterprise light toggle**, and **+3 tests**.

---

## A. Legal & regulatory audit

| Law | Posture | Evidence / gap |
|---|---|---|
| Labour Proc. **1156/2019** | ✅ facilitator, not employer | Parties sign the contract; worker is independent. *Risk if Serategna controls work — keep framing.* |
| **632/2009** Employment Exchange Services | ❌ **unresolved licence** | In-country matching may need an MoLS licence — **the #1 legal risk.** Mitigation: **no worker-side fees** (employer subscription only). |
| Overseas **923/2016 + 1246/2021** | ✅ out of scope | Stay domestic; overseas placement is a separate licensed business. |
| E-Transactions **1205/2020** | ✅ | OTP-assented consensus record + consent ledger. |
| Data Protection **1321/2024** | 🟡 strong, registration pending | Consent ledger, **phone masking**, Fayda never public, **self-service export + erasure** ✅; controller registration + DPO ❌. |
| NBE payments | ✅ no custody | Wages paid directly; **Serategna's own fees via a licensed PSP**, not direct. **Credit must be a partner-lender referral** (no balance-sheet lending). |
| Consumer Protection **813/2013** | ✅ | Honest copy ("AI"→"Smart"), transparent pricing, no broker cut. |
| Fayda **1284/2023** | 🟡 | Manual verification fallback; needs usage authorisation. |
| Tax / business licence | ❌ | Company registration + TIN/VAT/TOT outstanding. |
| Minimum wage | ✅ (note) | None statutory in Ethiopia — living-wage floor is a *voluntary* protection; **don't market it as a legal minimum.** |
| Guarantor / suretyship **1243/2021** | 🟡 | Amount-capped ዋስ agreement; counsel to confirm attestation thresholds. |

**Verdict:** unusually compliant for a marketplace at this stage — "compliant by design" (no custody, no worker fees, masked PII, consent ledger). **Two gating items:** the 632/2009 licence determination and DP-controller registration; plus standard business/tax registration.

## B. Best-practices audit

**Security — A−**
- ✅ **No SQL-injection surface** (100% Prisma + Zod), OTP brute-force lockout + throttle, JWT access + rotating refresh + revoke, **Helmet CSP/HSTS**, x-powered-by off, **phone masking**, **contacts revealed only after accept + signed agreement**, audited admin, layered rate limiting, secrets not in code/git.
- ❌ Gaps: **admin 2FA**, **Postgres RLS** (authz is app-layer + tested), **Redis-backed rate-limit** for multi-instance, **external pen test + SCA** beyond `npm audit`.

**Engineering — B+**
- ✅ TypeScript end-to-end, **stateless** API (horizontal scale), **bounded queries + pagination caps**, **hot-path indexes**, **HTTP cache headers**, **/v1 versioning**, `/health` + `/ready`, structured logging + request-id + error-capture seam, **CI** (tests + `npm audit` + secret-scan + docker build), **31 + 7 tests**, ledger reconciles to 0.
- ❌ Gaps: **≥80% coverage** + frontend e2e, **Redis response cache**, **object storage** for logos/proofs (base64 in DB today), **WebSocket** realtime (polling now), `db push` → **`migrate deploy`**, **PostGIS** geo at scale.

**Product / UX — B+**
- ✅ Housemaid-first flow, **trust layer** (guarantor, certifications, psychometrics, ratings, SoS), swipe-deck discovery, **role switch** (one account = worker+employer), dark mode, **trilingual taxonomy**, verified income passport, enterprise console, work-to-credit, certificate, wage-proof, iqub savings.
- ❌ Gaps: formal **accessibility** pass, **low-literacy/voice (USSD/IVR)**, **offline/PWA**, **native mobile** (WebView wrapper today).

## C. Recommendations to outcompete

**The competition & why they're weak**
- **Delalas (brokers):** expensive, opaque, one-off, leave maids underpaid — nothing compounds.
- **Telegram / classifieds:** zero trust, zero accountability.
- **Agencies:** charge the worker, opaque, reputation locked inside the agency.
- **Generic gig apps:** no trust infrastructure, no credit thesis, not housemaid-first.

**Serategna's structural edge → press it:**
1. **Own the data → ship credit + the verified Employment/Income Certificate.** This is the moat: a verified, guarantor-backed earnings history nobody can clone, that turns "I cleaned houses" into bankable, portable proof. *Build credit pre-qual + the printable certificate first.*
2. **Be the *licensed, compliant* player.** Getting the 632/2009 licence + data-protection registration is itself a **barrier to entry** — copycats can't legally scale. Speed-to-licence is strategy.
3. **Own the demographic competitors ignore.** Low-literacy **USSD/IVR + voice** onboarding reaches the feature-phone housemaid. Unglamorous, hard, and exactly the moat.
4. **Trust as the product, not a feature.** Guarantor (ዋስ) + ratings + certifications + **safety check-ins to family** are the marketing message — they directly answer the delala pain and women's-safety barrier.
5. **Anti-delala economics = the brand.** Worker keeps **100%**, employer pays a **flat subscription** (no commission), minimum wage enforced. "No broker fee, fair pay, guarantor-backed" *is* the go-to-market line.
6. **Wedge then expand.** Win permanent housemaids in 1–2 Addis sub-cities, prove liquidity + retention, then expand category-by-category (care, facility, trades) and into **enterprise talent pools** (recurring B2B revenue).
7. **Diaspora-managed care.** Email-registered diaspora book + monitor a maid/caregiver for family back home — high willingness-to-pay, sticky, recurring.
8. **Network effects via portable reputation.** The public, QR-verifiable passport makes *your* verification the standard landlords/lenders/employers cite — every worker who shares it markets Serategna.
9. **Compound the worker.** Skills→income ladder + iqub savings + credit turn Serategna into an **economic-mobility engine**, not a job board — switching cost rises with every job.
10. **Data products (phase 2).** Wage benchmarking, demand prediction, and the earnings dataset itself become B2B/financial-services revenue.

**90-day priorities to win:** (1) 632/2009 legal opinion + Ethio Telecom SMS → real pilot; (2) ship credit-readiness + the verified certificate (the moat); (3) low-literacy onboarding for the housemaid wedge; (4) lock the housemaid pilot's trust+safety loop and measure retention/repeat-hire.

---

_Compiled June 2026 · Mo Creatives · Confidential. Pairs with READINESS, LEGAL_COMPLIANCE, SCALING, PILOT._
