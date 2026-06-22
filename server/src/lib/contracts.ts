import { employmentType, RATE_LABEL } from './employment.js';

// Contract templates. Plain-language, bilingual-ready, and drafted to the
// Labour Proclamation 1156/2019 contractor boundary + E-Transactions
// Proclamation 1205/2020 (OTP digital assent). For permanent/contract roles a
// stronger template is used; counsel review is flagged for high-value sureties.

export interface ContractParties {
  clientName: string;
  workerName: string;
  amount?: number | null;
  rateType?: string;
  durationLabel?: string | null;
  scope?: string[];
  category: string;
  subCity: string;
}

export function buildContract(type: string, p: ContractParties) {
  const et = employmentType(type);
  const rate = p.rateType ?? et.defaultRate;
  const amountLine =
    p.amount != null ? `ETB ${p.amount.toLocaleString()} ${RATE_LABEL[rate] ?? ''}` : 'as agreed in-app';
  const scope = (p.scope && p.scope.length ? p.scope : ['Work to be performed to an agreed standard.'])
    .map((s) => `   • ${s}`)
    .join('\n');

  const title = `${et.label} Agreement — ${p.category} (${p.subCity})`;

  const body = `# ${title}

This Service Agreement is entered into via the Serategna platform between
**${p.clientName}** ("the Client") and **${p.workerName}** ("the Worker").

## 1. Nature of engagement
The Worker is an **independent contractor**, not an employee of the Client or of
Serategna. The Worker sets their own availability, may accept or decline freely,
may work on other platforms, and supplies their own tools. Nothing herein creates
an employment relationship under Labour Proclamation No. 1156/2019.

## 2. Scope of work
${scope}

## 3. Compensation
Payment: **${amountLine}**.${et.requiresEscrow ? `
Funds are held in Serategna's escrow and released to the Worker only upon the
Client's confirmation of completion (or automatic confirmation after 24 hours).` : `
Payment for this engagement is settled directly between the parties under the
terms above; Serategna provides the contract and matching service.`}
${p.durationLabel ? `\nDuration: **${p.durationLabel}**.` : ''}

## 4. Standards & rework
The Worker will perform the work professionally and on time. For escrow-paid
in-app jobs, a rework guarantee applies: one free return visit within 72 hours
for legitimate quality issues.

## 5. Safety & conduct
Both parties agree to Serategna's Community & Safety standards, including the SoS
safety protocol. Harassment, fraud, or off-platform circumvention may result in
removal from the platform.

## 6. Disputes
Disputes are first mediated by Serategna (48-hour target). The escrow is released,
refunded, or split per the mediation outcome. This does not waive either party's
legal rights.

## 7. Data & consent
Both parties consent to Serategna processing engagement data under the Personal
Data Protection Proclamation No. 1321/2024, solely to operate the platform and,
where separately and explicitly consented, to build the Worker's Serategna Score.

## 8. Consensus record (not the legal contract)
Confirming this in the app records the **mutual consensus** of both parties on the
terms above — it is a shared, timestamped understanding, not the binding legal
contract. **The legally binding employment contract must be signed in person**
between the employer and the worker (for domestic/housemaid roles, a kebele- or
court-attested contract with the guarantor present is recommended). Serategna
provides this record and the matching/trust layer; it is not a party to the
in-person contract.
`;

  const termsJson = JSON.stringify({
    type,
    amount: p.amount ?? null,
    rateType: rate,
    durationLabel: p.durationLabel ?? null,
    requiresEscrow: et.requiresEscrow,
  });

  return { title, body, termsJson };
}

export function buildGuarantorContract(p: {
  guarantorName: string;
  workerName: string;
  amountCap: number;
  relationship: string;
}) {
  const title = `Wastina (ዋስትና) Guarantor Agreement — ${p.workerName}`;
  const body = `# ${title}

This is a **Wastina (ዋስ / ዋስትና)** agreement — the Ethiopian legal surety in
which a guarantor formally takes responsibility for another person. In Ethiopia a
*was* (ዋስ) is customarily and legally required to hire a domestic worker
(housemaid, live-in helper); it protects both the household and the worker.

**${p.guarantorName}** ("the Guarantor / ዋስ"), in their capacity as
${p.relationship}, stands as wastina for **${p.workerName}** ("the Worker") on the
Serategna platform.

## 1. Legal responsibility (ዋስትና)
The Guarantor accepts legal responsibility as surety for the Worker under the
Commercial Code (Proclamation No. 1243/2021). Liability is **capped at ETB
${p.amountCap.toLocaleString()}** and is limited to the obligations expressly
guaranteed here (e.g. accountability for the engagement, or a specific financed
amount in a credit product). The Guarantor is not liable beyond the cap.

## 2. Identity & standing
The Guarantor confirms their identity (Fayda) and that the statements vouching for
the Worker's character and reliability are true to the best of their knowledge.

## 3. Scope
This wastina does not make the Guarantor a party to the Worker's day-to-day jobs.
It is invoked only if a guaranteed obligation is unmet, and only up to the cap.

## 4. Revocation
The Guarantor may revoke this wastina for **future** obligations at any time by
notice in-app; obligations already incurred remain covered up to the cap.

## 5. Electronic signature
By signing with a one-time code sent to their registered phone, the Guarantor
provides binding digital assent under Proclamation No. 1205/2020. For amounts
above a counsel-set threshold, wet-ink or in-branch (kebele/court-attested)
confirmation may additionally be required before the wastina is enforceable.
`;
  return { title, body, termsJson: JSON.stringify({ amountCap: p.amountCap, relationship: p.relationship, type: 'wastina' }) };
}
