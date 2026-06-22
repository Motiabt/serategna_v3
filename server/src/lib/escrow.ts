import { prisma } from './prisma.js';
import { ACCOUNTS, post } from './ledger.js';

/**
 * Confirm a client payment into the CBE escrow sub-account. Idempotent: safe to
 * call from both an instant adapter response and an async aggregator webhook.
 * Returns true if it transitioned the job to FUNDED, false if already funded.
 */
export async function confirmEscrowFunding(
  jobId: string,
  externalRef: string,
  method: string,
): Promise<boolean> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');
  if (!job.agreedPrice) throw new Error('No agreed price');
  if (job.escrowState !== 'none') return false; // already funded

  await prisma.$transaction(async (tx) => {
    await post(
      [
        {
          debitAccount: ACCOUNTS.BANK_ESCROW,
          creditAccount: ACCOUNTS.CLIENT_ESCROW,
          amount: job.agreedPrice!,
          jobId: job.id,
          ownerId: job.clientId,
          externalRef,
          memo: `Escrow funded via ${method}`,
        },
      ],
      tx,
    );
    await tx.job.update({ where: { id: job.id }, data: { escrowState: 'funded' } });
  });
  return true;
}
