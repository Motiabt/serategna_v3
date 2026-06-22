// Platform policies. Plain-language summaries with the regulatory anchor points.
// These must be reviewed by retained Ethiopian counsel before public launch
// (spec A3, B4) — they are written to the no-stored-value, no-lending design.

export const LEGAL_VERSION = '1.0';

export const TERMS = {
  version: LEGAL_VERSION,
  title: 'Terms & Conditions',
  updated: '2026-06-01',
  sections: [
    {
      h: '1. What Serategna is',
      p: 'Serategna is a marketplace that connects clients with independent service workers in Ethiopia and provides escrow, ratings, safety, contracts and a verified work record. Serategna is not a bank, lender, or payment operator.',
    },
    {
      h: '2. No stored value (NBE compliance)',
      p: 'Serategna does NOT issue wallets or hold stored value, and therefore does not require an NBE Payment Instrument Issuer licence. Client payments sit in a segregated escrow sub-account held at a licensed bank in trust for the parties. Your in-app balance is a ledger view of money already owed to you, withdrawable on demand only to your own Telebirr or bank account. All payment processing runs through a licensed Payment System Operator (aggregator).',
    },
    {
      h: '3. Independent contractors',
      p: 'Workers are independent contractors, not employees of Serategna or of clients. Workers set their availability, accept or decline freely, work across platforms, and supply their own tools (Labour Proclamation No. 1156/2019).',
    },
    {
      h: '4. Escrow & payments',
      p: 'For escrow-protected jobs, client funds are held until completion is confirmed (or auto-confirmed after 24 hours), then split into the worker payment, the platform commission, and a 1% guarantee reserve. Take-rate is shown before you transact.',
    },
    {
      h: '5. Contracts & e-signatures',
      p: 'Job and guarantor agreements may be signed with a one-time code sent to your phone, constituting binding digital assent under the Electronic Transactions Proclamation No. 1205/2020.',
    },
    {
      h: '6. Conduct & safety',
      p: 'You agree to behave lawfully and respectfully, to use the SoS safety tools only in genuine need, and not to circumvent the platform to avoid protections. Fraud, harassment, or unsafe conduct can lead to removal.',
    },
    {
      h: '7. Disputes',
      p: 'Disputes are mediated by Serategna within a 48-hour target; the escrow outcome follows the mediation. This does not waive your legal rights.',
    },
    {
      h: '8. Liability',
      p: 'Serategna provides the platform "as is" and facilitates connections; it is not a party to the work performed. To the extent permitted by law, Serategna’s liability is limited to the commission charged on the affected transaction.',
    },
  ],
};

export const PRIVACY = {
  version: LEGAL_VERSION,
  title: 'Privacy Policy',
  updated: '2026-06-01',
  sections: [
    {
      h: '1. Our commitment',
      p: 'We process personal data under the Personal Data Protection Proclamation No. 1321/2024 with consent, purpose limitation, and your full data-subject rights. Data is resident in Ethiopia.',
    },
    {
      h: '2. What we collect',
      p: 'Phone number, name, language, location for matching, job and earnings history, ratings, and (for verification) your Fayda number and documents. Sensitive identifiers are encrypted at the application layer.',
    },
    {
      h: '3. How we use it',
      p: 'To operate the marketplace, process escrow, keep you safe, and — only with your separate explicit consent — to build your Serategna Score and share it with a named lender you choose.',
    },
    {
      h: '4. SoS audio',
      p: 'Emergency audio is encrypted for the emergency-response provider only. Serategna cannot decrypt it.',
    },
    {
      h: '5. Your rights',
      p: 'You can access a copy of your data, correct it, withdraw consent, and request erasure (which removes shared records without deleting your own Score history). Contact the Data Protection Officer in-app.',
    },
    {
      h: '6. Sharing',
      p: 'We never sell your data. We share it only with processors needed to run the service (e.g. the licensed payment aggregator) under data-processing agreements, and with lenders only per your named, revocable consent.',
    },
  ],
};
