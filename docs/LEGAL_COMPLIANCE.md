# Serategna — Ethiopian Legal & Regulatory Compliance Research

Purpose: identify the laws governing jobs, labour, contracts and related
arrangements in Ethiopia so Serategna can operate **without being sued, fined,
or shut down**, and a risk register with mitigations.

> ⚠️ **Not legal advice.** This is a structured research brief for the team. The
> laws below must be confirmed with a licensed **Ethiopian attorney** before
> launch — especially the licensing question in §2, which is the single biggest
> regulatory risk to the business.

---

## 1. Employment relationship & classification — Labour Proclamation No. 1156/2019
The principal labour law (replaced the 2003 proclamation); regulator is the
**Ministry of Labour and Skills (MoLS)**. It governs employer–worker contracts,
working hours, leave, termination, wages and dispute settlement.

**What it means for Serategna:**
- Serategna is a **facilitator/marketplace**, *not the employer*. The employment
  relationship is between the **client and the worker**. The app's contract
  template states this explicitly and treats the worker as an independent party.
- The **binding contract is signed in person** between client and worker; the
  in-app "agreement" records mutual consensus only. This keeps Serategna out of
  the employer's statutory obligations (severance, leave, etc.).
- **Risk:** if Serategna directs the work, sets wages unilaterally, or controls
  workers, a court could deem it an employer/labour-supplier. *Mitigation:* keep
  the facilitator framing; workers set availability, accept/decline freely, and
  agree terms with the client.
- Domestic workers historically sat partly outside the main labour law's scope;
  treat domestic-work contracts carefully and prefer **written, attested
  contracts** (kebele/court) — which the app encourages.

## 2. ⭐ Local job-matching license — Employment Exchange Services Proclamation No. 632/2009
**This is the key one.** In-country matching of workers to employers ("employment
exchange services") is regulated. A private entity providing such services
generally must be **registered/licensed with MoLS** and follow rules on fees and
worker protection. Operating an unlicensed employment-exchange/placement business
is the most likely ground to be **stopped**.

**Action required (top priority):** have counsel confirm whether Serategna's
model (subscription-funded marketplace, no fee charged to the worker, contract
signed by the parties) **(a)** requires an Employment Exchange Services / private
employment agency licence, or **(b)** falls outside it as a neutral technology
platform. If (a), obtain the licence before onboarding workers at scale.
*Mitigation already in product:* **no fee is charged to workers** (employer
subscription only) — agencies charging workers are the most heavily restricted.

## 3. Overseas placement — Overseas Employment Proclamation No. 923/2016, amended by No. 1246/2021
Only relevant **if Serategna ever places workers abroad** (e.g., Gulf domestic
work). It requires: a **bilateral agreement/MOU** with the receiving country for
domestic work, MoLS licensing of the private employment agency, a deposit/bond,
and worker-protection duties (Labour Attaché oversight).
- **Today Serategna does *not* do overseas placement** → out of scope.
- **But** the Verified Income/Employment Certificate could be *used by* workers
  seeking overseas jobs. Keep Serategna clearly domestic; if you add overseas
  placement later, it is a **separate, heavily-licensed business**.

## 4. Contracts, signatures & guarantor (suretyship)
- **Written contracts** for employment are expected; the app generates them and
  the parties sign in person. For permanent/domestic roles, recommend a
  **kebele- or court-attested** contract with the guarantor present.
- **Electronic signatures / consent:** the **Electronic Transactions Proclamation
  No. 1205/2020** gives legal effect to electronic signatures and records — the
  basis for the app's OTP-assented consensus record and consent ledger.
- **Guarantor (ዋስ / wastina):** suretyship is recognised under the **Civil Code**
  (and commercial suretyship under Proclamation No. 1243/2021). The app's
  amount-capped guarantor agreement should be counsel-reviewed for enforceability
  thresholds (above a set amount, wet-ink/attested may be required).

## 5. Payments & financial regulation — National Bank of Ethiopia (NBE)
- **No funds custody → no Payment Instrument Issuer licence.** Worker wages are
  paid **directly** (Telebirr/CBE Birr/cash); Serategna never holds or routes
  user money. Holding/transferring user funds would trigger NBE licensing
  (Licensing of Payment Instrument Issuers / Payment System Operators directives).
- **Serategna's own fees** (employer subscription, enterprise packages) are now
  **collected through a licensed PSP** (Chapa-class hosted checkout), *not*
  directly — so even Serategna's revenue avoids handling raw card/bank data.
- **Credit/lending products** (the work-to-credit feature) **must** be delivered
  by a **licensed bank/MFI partner**; Serategna only provides the eligibility
  signal and referral — it must not lend on its own balance sheet without an NBE
  credit licence.

## 6. Data protection & privacy — Personal Data Protection Proclamation No. 1321/2024
- Lawful basis + **consent ledger** (implemented), data minimisation, **phone
  numbers masked** until a signed agreement, **Fayda ID never public**.
- **Data-subject rights:** access, export, and **erasure** — implemented
  (self-service export + account deletion, plus an audited admin DPO tool).
- **Action:** register/notify as a data controller as the Proclamation's
  secondary regulations require; appoint a DPO; define retention periods.

## 7. Identity — Fayda / National ID (Proclamation No. 1284/2023)
Using Fayda for KYC requires authorisation/integration with the National ID
program. Until then, **manual verification** is the fallback. Don't store the raw
Fayda number publicly (already enforced).

## 8. Consumer protection & business licensing
- **Trade Competition & Consumer Protection Proclamation No. 813/2013** — fair
  terms, no misleading claims (note: rebrand the rule-based "AI" features honestly
  — already done). Clear pricing, refund/cancellation terms.
- **Business registration & trade licence** (Commercial Registration & Business
  Licensing Proclamation) for the operating company.
- **Tax:** register for **TIN, VAT or TOT** with the Ministry of Revenue; issue
  compliant receipts for subscription/enterprise revenue (ERCA/MoR).

## 9. Telecom / SMS
- A2P/bulk SMS requires an **approved sender ID/short code** and compliance with
  the **Ethiopian Communications Authority (ECA)** and the operator (Ethio
  Telecom / Safaricom). OTP is sent **only to valid Ethiopian mobile numbers**
  (Ethio Telecom 09… / Safaricom 07…); diaspora users use **email**.

## 10. Sector-specific & employment conditions
- **Minimum wage:** Ethiopia has **no statutory private-sector minimum wage**;
  Serategna's enforced **living-wage floor** is a *voluntary protection*, not a
  legal requirement — but it strongly mitigates exploitation/PR risk. Don't claim
  it is a legal minimum.
- **Child labour / forced labour:** prohibited (1156/2019 + international
  conventions). Enforce a minimum age at onboarding and prohibit listings that
  breach this.
- **Non-discrimination & harassment:** reflected in community standards + SoS.

---

## Risk register — what could get Serategna sued or stopped
| # | Risk | Likelihood | Mitigation (status) |
|---|---|---|---|
| 1 | Operating an **unlicensed employment-exchange/agency** (632/2009) | **High** | Counsel determination + licence; no worker-side fees ✅ |
| 2 | Being deemed the **employer/labour supplier** (1156/2019) | Medium | Facilitator framing; parties sign the contract ✅ |
| 3 | **Holding/transferring funds** → NBE PI licence | Low | No custody; fees via licensed PSP ✅ |
| 4 | **Lending** without an NBE/MFI licence | Medium | Credit = partner-lender referral only; no balance-sheet lending |
| 5 | **Data-protection** non-compliance (1321/2024) | Medium | Consent ledger, masking, export/erasure ✅; register + DPO ☐ |
| 6 | **Overseas placement** rules (923/2016, 1246/2021) | Low | Stay domestic; overseas is a separate licensed business |
| 7 | **Misleading claims / consumer** issues (813/2013) | Low | Honest copy ✅; clear pricing/terms |
| 8 | **Unattested high-value contracts/guarantees** unenforceable | Medium | Recommend kebele/court attestation; counsel thresholds |
| 9 | **Tax / business-licence** gaps | Medium | Register company, TIN/VAT/TOT; compliant receipts ☐ |
| 10 | **SMS sender-ID / ECA** non-compliance | Low | Approved sender id; ET-only OTP ✅ |

## Pre-launch legal checklist
- [ ] **Counsel opinion on the 632/2009 employment-exchange licence** (gating).
- [ ] Company registration + trade licence; TIN/VAT or TOT.
- [ ] Terms of Service, Privacy Policy, contractor & guarantor templates — counsel-reviewed and published.
- [ ] Data-protection controller registration + DPO appointment + retention schedule (1321/2024).
- [ ] Fayda integration authorisation (or run manual verification).
- [ ] Licensed-PSP agreement for subscription collection; licensed bank/MFI partner before any credit product.
- [ ] ECA/operator sender-ID approval for SMS.
- [ ] Confirm domestic-worker contract handling and minimum-age enforcement.

---

### Sources
- [Labour Proclamation No. 1156/2019 — Ministry of Justice](https://justice.gov.et/en/law/labour-proclamation/)
- [Labour Proclamation No. 1156/2019 — full text (metaappz)](https://www.metaappz.com/References/ethiopian_laws/federal/pr_1156_2019/en/txt)
- [Employment Exchange Services Proclamation No. 632/2009 — Ministry of Justice](https://justice.gov.et/en/law/employment-exchange-services-proclamation/)
- [Ethiopia's Overseas Employment Proclamation No. 923/2016 — Ministry of Justice](https://justice.gov.et/en/law/ethiopias-overseas-employment-proclamation/)
- [Overseas Employment (Amendment) Proclamation No. 1246/2021 — Ethiolex](https://ethiolex.com/key-amendments-introduced-by-ethiopias-overseas-employment-proclamation-no-1246-2021/)
- [Key employment laws in Ethiopia — employer guide (Asanify)](https://asanify.com/global-employer-of-record/ethiopia/employment-laws/)

_Compiled June 2026 for Mo Creatives. Confirm with Ethiopian counsel before launch._
