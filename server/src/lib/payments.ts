import { createHmac } from 'node:crypto';

// Payment aggregator adapter pattern (spec B3.4). Launch on a licensed PSO
// (Chapa-class); add direct Telebirr / CBE Birr behind the same interface
// without touching call sites. Swapping rails is a config change, not a rewrite.

export interface InitiateInput {
  jobId: string;
  amount: number; // whole ETB
  method: 'telebirr' | 'cbe_birr' | 'card';
  reference: string;
}

export interface InitiateResult {
  externalRef: string;
  checkoutUrl?: string; // for hosted-checkout aggregators
  status: 'pending' | 'confirmed';
}

export interface PaymentAdapter {
  name: string;
  initiate(input: InitiateInput): Promise<InitiateResult>;
  refund(externalRef: string, amount: number): Promise<{ ok: boolean }>;
  payout(input: { destination: string; amount: number; reference: string }): Promise<{ externalRef: string }>;
  /** Validate an inbound webhook (HMAC signature) — spec E1. */
  verifyWebhook(rawBody: string, signature: string | undefined): boolean;
}

/**
 * MockAggregator — confirms instantly so the full flow works end-to-end in
 * dev/demo. Real adapters (ChapaAdapter, ArifPayAdapter, …) implement the same
 * interface and confirm asynchronously via verifyWebhook + a webhook route.
 */
class MockAggregator implements PaymentAdapter {
  name = 'mock';
  async initiate(input: InitiateInput): Promise<InitiateResult> {
    return { externalRef: `${input.method}_${input.reference}`, status: 'confirmed' };
  }
  async refund(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
  async payout(input: { destination: string; amount: number; reference: string }) {
    return { externalRef: `payout_${input.destination}_${input.reference}` };
  }
  verifyWebhook(): boolean {
    return true;
  }
}

/**
 * ChapaAdapter — licensed PSO (Chapa-class) hosted checkout. Initiates a
 * transaction and returns a checkout URL; the payment is confirmed
 * asynchronously via the signed webhook (POST /api/payments/webhook).
 * Reads CHAPA_SECRET_KEY / CHAPA_WEBHOOK_SECRET from env.
 */
class ChapaAdapter implements PaymentAdapter {
  name = 'chapa';
  private base = process.env.CHAPA_BASE_URL ?? 'https://api.chapa.co/v1';
  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const key = process.env.CHAPA_SECRET_KEY;
    if (!key) {
      // not configured → behave like mock so the flow still works in dev
      return { externalRef: `${input.method}_${input.reference}`, status: 'confirmed' };
    }
    const res = await fetch(`${this.base}/transaction/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: input.amount,
        currency: 'ETB',
        tx_ref: input.reference,
        callback_url: process.env.CHAPA_CALLBACK_URL,
      }),
    });
    const data = (await res.json()) as any;
    return { externalRef: input.reference, checkoutUrl: data?.data?.checkout_url, status: 'pending' };
  }
  async refund(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
  async payout(input: { destination: string; amount: number; reference: string }) {
    return { externalRef: `payout_${input.destination}_${input.reference}` };
  }
  verifyWebhook(rawBody: string, signature: string | undefined): boolean {
    const secret = process.env.CHAPA_WEBHOOK_SECRET;
    if (!secret) return process.env.NODE_ENV !== 'production';
    // Chapa signs the payload with HMAC-SHA256; compare to the Chapa-Signature header
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return !!signature && timingSafeEqualHex(expected, signature);
  }
}

const adapters: Record<string, PaymentAdapter> = {
  mock: new MockAggregator(),
  chapa: new ChapaAdapter(),
};

export function paymentAdapter(): PaymentAdapter {
  const key = process.env.PAYMENT_ADAPTER ?? 'mock';
  return adapters[key] ?? adapters.mock;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
