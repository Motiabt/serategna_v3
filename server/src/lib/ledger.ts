import { nanoid } from 'nanoid';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { config } from '../config.js';

// Internal accounts (spec B3.2). All amounts are whole ETB integers.
export const ACCOUNTS = {
  BANK_ESCROW: 'bank_escrow', // CBE escrow sub-account (asset)
  CLIENT_ESCROW: 'client_funds_in_escrow', // per-job liability
  WORKER_PAYABLE: 'worker_payable', // per-worker liability
  PLATFORM_COMMISSION: 'platform_commission',
  GUARANTEE_RESERVE: 'guarantee_reserve',
  REFUNDS: 'refunds',
  // Direct (off-platform) payment record — Serategna never holds these funds.
  DIRECT_EMPLOYER: 'direct_employer',
  DIRECT_WORKER: 'direct_worker',
} as const;

type Line = {
  debitAccount: string;
  creditAccount: string;
  amount: number;
  jobId?: string;
  ownerId?: string;
  externalRef?: string;
  memo?: string;
};

type Tx = Prisma.TransactionClient;

/** Post a balanced group of double-entry lines under a single txnId. */
export async function post(lines: Line[], db: Tx | typeof prisma = prisma): Promise<string> {
  const txnId = nanoid();
  for (const l of lines) {
    if (l.amount <= 0) continue;
    await db.ledgerEntry.create({
      data: {
        txnId,
        debitAccount: l.debitAccount,
        creditAccount: l.creditAccount,
        amount: Math.round(l.amount),
        jobId: l.jobId ?? null,
        ownerId: l.ownerId ?? null,
        externalRef: l.externalRef ?? null,
        memo: l.memo ?? '',
      },
    });
  }
  return txnId;
}

/** Credit-normal balance for an account, optionally scoped to an owner/job. */
export async function balance(
  account: string,
  opts: { ownerId?: string; jobId?: string } = {},
): Promise<number> {
  const where: Prisma.LedgerEntryWhereInput = {};
  if (opts.ownerId) where.ownerId = opts.ownerId;
  if (opts.jobId) where.jobId = opts.jobId;

  const credits = await prisma.ledgerEntry.aggregate({
    _sum: { amount: true },
    where: { ...where, creditAccount: account },
  });
  const debits = await prisma.ledgerEntry.aggregate({
    _sum: { amount: true },
    where: { ...where, debitAccount: account },
  });
  return (credits._sum.amount ?? 0) - (debits._sum.amount ?? 0);
}

/** Worker's withdrawable balance = released earnings not yet paid out. */
export function workerPayable(workerId: string): Promise<number> {
  return balance(ACCOUNTS.WORKER_PAYABLE, { ownerId: workerId });
}

export const takeRate = (vertical: string, accountType?: string): number => {
  if (accountType === 'business' || accountType === 'sme') return config.economics.takeRateBusiness;
  return vertical === 'delivery' ? config.economics.takeRateDelivery : config.economics.takeRateHome;
};

/** Compute the split of a confirmed job total. */
export function splitJob(total: number, vertical: string, accountType?: string) {
  const rate = takeRate(vertical, accountType);
  const reserve = Math.round(total * config.economics.guaranteeReserveRate);
  const grossCommission = Math.round(total * rate);
  const commission = Math.max(0, grossCommission - reserve);
  const workerNet = total - grossCommission;
  return { total, rate, reserve, commission, workerNet, grossCommission };
}
