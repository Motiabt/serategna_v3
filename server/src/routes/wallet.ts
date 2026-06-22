import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ACCOUNTS, post, workerPayable } from '../lib/ledger.js';
import { ah, authRequired, HttpError } from '../middleware/auth.js';
import { config } from '../config.js';

export const walletRouter = Router();

// ── Worker earnings overview ─────────────────────────────────────────────────
walletRouter.get(
  '/me',
  authRequired,
  ah(async (req, res) => {
    const workerId = req.user!.sub;
    const [payable, entries, payouts, user] = await Promise.all([
      workerPayable(workerId),
      prisma.ledgerEntry.findMany({
        where: { ownerId: workerId, creditAccount: ACCOUNTS.WORKER_PAYABLE },
        include: { job: { select: { title: true } } },
        orderBy: { postedAt: 'desc' },
        take: 30,
      }),
      prisma.payout.findMany({ where: { workerId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.user.findUnique({ where: { id: workerId } }),
    ]);

    // pending = earnings still held in escrow on in-progress jobs
    const heldEntries = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { creditAccount: ACCOUNTS.CLIENT_ESCROW, job: { workerId, escrowState: 'held' } },
    });

    res.json({
      withdrawable: payable,
      pendingInEscrow: heldEntries._sum.amount ?? 0,
      canWithdraw: (user?.tier ?? 0) >= 1,
      tier: user?.tier ?? 0,
      earnings: entries.map((e) => ({
        id: e.id,
        amount: e.amount,
        job: e.job?.title ?? 'Earnings',
        postedAt: e.postedAt,
      })),
      payouts,
    });
  }),
);

// ── Request a payout (Tier 1+ only — spec B2.2) ──────────────────────────────
walletRouter.post(
  '/payouts',
  authRequired,
  ah(async (req, res) => {
    const { amount, destination } = z
      .object({
        amount: z.number().int().positive(),
        destination: z.enum(['telebirr', 'bank']).default('telebirr'),
      })
      .parse(req.body);

    const workerId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { id: workerId } });
    if (!user || user.tier < 1)
      throw new HttpError(403, 'Verify with Fayda (Tier 1) to withdraw your escrowed earnings.');

    const available = await workerPayable(workerId);
    if (amount > available) throw new HttpError(400, `Only ETB ${available} available to withdraw`);

    // Daily payout cap with manual-review threshold (spec E1).
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const todays = await prisma.payout.aggregate({
      _sum: { amount: true },
      where: { workerId, createdAt: { gte: since }, status: { in: ['paid', 'processing'] } },
    });
    if ((todays._sum.amount ?? 0) + amount > config.payouts.dailyCap) {
      throw new HttpError(
        429,
        `Daily payout cap is ETB ${config.payouts.dailyCap}. Larger amounts need manual review.`,
      );
    }

    const externalRef = `payout_${destination}_${Date.now()}`;
    const payout = await prisma.$transaction(async (tx) => {
      await post(
        [
          {
            debitAccount: ACCOUNTS.WORKER_PAYABLE,
            creditAccount: ACCOUNTS.BANK_ESCROW,
            amount,
            ownerId: workerId,
            externalRef,
            memo: `Payout to ${destination}`,
          },
        ],
        tx,
      );
      return tx.payout.create({
        data: { workerId, amount, destination, status: 'paid', externalRef },
      });
    });
    res.status(201).json(payout);
  }),
);

// ── Full ledger view (transparency / audit) ──────────────────────────────────
walletRouter.get(
  '/ledger',
  authRequired,
  ah(async (req, res) => {
    const entries = await prisma.ledgerEntry.findMany({
      where: { ownerId: req.user!.sub },
      orderBy: { postedAt: 'desc' },
      take: 100,
    });
    res.json(entries);
  }),
);
