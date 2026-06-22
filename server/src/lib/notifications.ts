// Notification fan-out (spec B3.1): FCM push with SMS fallback for every
// critical event, plus the Telegram bridge. Also writes a user-facing
// Notification row so the in-app bell/feed and reminders work.

import { prisma } from './prisma.js';
import { sendSms } from './sms.js';

type Channel = 'push' | 'sms' | 'telegram';

const TEMPLATES: Record<string, { type: string; title: string; body: string; link?: string }> = {
  'job.confirmed_paid': { type: 'payout', title: 'Payment released', body: 'Your earnings were released to your ledger.', link: '/app/wallet' },
  'job.new_bid': { type: 'bid', title: 'New bid on your job', body: 'A worker placed a bid. Review and accept.', link: '/app/orders' },
  'job.assigned': { type: 'job', title: "You're hired", body: 'A client accepted your bid.', link: '/app/orders' },
  'job.funded': { type: 'job', title: 'Escrow funded', body: 'The client funded escrow — you can start.', link: '/app/orders' },
  'job.completed': { type: 'job', title: 'Work completed', body: 'Confirm completion to release escrow.', link: '/app/orders' },
  'contract.fully_signed': { type: 'contract', title: 'Contract signed', body: 'Your contract is fully signed.', link: '/app/contracts' },
  'contract.to_sign': { type: 'contract', title: 'Signature needed', body: 'A contract is waiting for your signature.', link: '/app/contracts' },
  'sos.dispatched': { type: 'sos', title: 'Emergency dispatched', body: 'Help has been notified. Stay safe.', link: '/app/home' },
  'business.profile_created': { type: 'system', title: 'Business profile ready', body: 'Your company profile was created from your license.', link: '/app/profile' },
  'verification.approved': { type: 'system', title: 'Verified ✓', body: 'Your Fayda verification was approved. Withdrawals unlocked.', link: '/app/wallet' },
  'reminder.confirm': { type: 'reminder', title: 'Reminder: confirm your job', body: 'Please confirm completion so the worker gets paid.', link: '/app/orders' },
};

export interface NotifyInput {
  userId: string;
  templateKey: string;
  payload?: Record<string, unknown>;
  channels?: Channel[];
  title?: string;
  body?: string;
  link?: string;
  type?: string;
  dueAt?: Date;
  persist?: boolean; // write an in-app Notification (default true)
}

async function deliver(channel: Channel, phone: string, templateKey: string, title: string, body: string) {
  // SMS goes over the real gateway (console fallback in dev). Push/Telegram
  // remain seams until those providers are wired.
  if (channel === 'sms') {
    const r = await sendSms(phone, `${title}: ${body}`);
    return r.ok;
  }
  console.log(`[notify:${channel}] ${phone} ${templateKey}`);
  return true;
}

export async function notify(input: NotifyInput) {
  const { userId, templateKey, channels, persist = true } = input;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const tpl = TEMPLATES[templateKey];
  // in-app notification row (bell/feed)
  if (persist) {
    await prisma.notification
      .create({
        data: {
          userId,
          type: input.type ?? tpl?.type ?? 'system',
          title: input.title ?? tpl?.title ?? 'Notification',
          body: input.body ?? tpl?.body ?? '',
          link: input.link ?? tpl?.link ?? null,
          dueAt: input.dueAt ?? null,
        },
      })
      .catch(() => undefined);
  }

  // SMS is the reliability floor on low-end devices (spec B3.1).
  const title = input.title ?? tpl?.title ?? 'Serategna';
  const body = input.body ?? tpl?.body ?? '';
  const order: Channel[] = channels ?? ['push', 'sms'];
  for (const channel of order) {
    try {
      const ok = await deliver(channel, user.phone, templateKey, title, body);
      await prisma.notificationLog
        .create({ data: { userId, channel, templateKey, payload: JSON.stringify(input.payload ?? {}), status: ok ? 'sent' : 'failed' } })
        .catch(() => undefined);
      if (ok) break;
    } catch {
      /* try next channel */
    }
  }
}
