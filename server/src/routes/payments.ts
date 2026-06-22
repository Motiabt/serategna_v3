import { Router } from 'express';
import { paymentAdapter } from '../lib/payments.js';
import { confirmEscrowFunding } from '../lib/escrow.js';
import { activate } from '../lib/subscription.js';
import { ah } from '../middleware/auth.js';

export const paymentsRouter = Router();

// ── Aggregator webhook (public, HMAC-verified) — spec E1 ─────────────────────
// Real PSOs (Chapa-class) confirm payment asynchronously. We validate the
// signature, then fund the job's escrow idempotently.
paymentsRouter.post(
  '/webhook',
  ah(async (req, res) => {
    const adapter = paymentAdapter();
    const raw = (req as any).rawBody ?? JSON.stringify(req.body ?? {});
    const signature =
      (req.headers['chapa-signature'] as string) || (req.headers['x-signature'] as string);

    if (!adapter.verifyWebhook(raw, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const body = req.body ?? {};
    const txRef: string | undefined = body.tx_ref || body.reference;
    const status: string = body.status ?? 'success';
    if (!txRef) return res.status(400).json({ error: 'Missing tx_ref' });

    const paid = status === 'success' || status === 'completed';
    if (paid && txRef.startsWith('sub_')) {
      // Serategna subscription fee: `sub_<userId>_<plan>_<ts>`
      const [, userId, plan] = txRef.split('_');
      if (userId && (plan === 'monthly' || plan === 'annual')) {
        await activate(userId, plan).catch(() => undefined);
      }
    } else if (paid) {
      // job escrow funding (legacy): `${jobId}_${timestamp}`
      await confirmEscrowFunding(txRef.split('_')[0], txRef, adapter.name).catch(() => undefined);
    }
    res.json({ received: true });
  }),
);
