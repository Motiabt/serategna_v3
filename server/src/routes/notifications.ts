import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, authRequired } from '../middleware/auth.js';

export const notificationsRouter = Router();

// ── My notifications + reminders ─────────────────────────────────────────────
notificationsRouter.get(
  '/',
  authRequired,
  ah(async (req, res) => {
    const items = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const now = new Date();
    const notifications = items.filter((n) => !n.dueAt || n.dueAt <= now || n.type !== 'reminder');
    const reminders = items.filter((n) => n.type === 'reminder' && n.dueAt && n.dueAt > now);
    const unread = items.filter((n) => !n.read && (!n.dueAt || n.dueAt <= now)).length;
    res.json({ notifications, reminders, unread });
  }),
);

notificationsRouter.get(
  '/unread-count',
  authRequired,
  ah(async (req, res) => {
    const unread = await prisma.notification.count({
      where: { userId: req.user!.sub, read: false, OR: [{ dueAt: null }, { dueAt: { lte: new Date() } }] },
    });
    res.json({ unread });
  }),
);

notificationsRouter.post(
  '/read',
  authRequired,
  ah(async (req, res) => {
    const { id } = z.object({ id: z.string().optional() }).parse(req.body ?? {});
    if (id) await prisma.notification.updateMany({ where: { id, userId: req.user!.sub }, data: { read: true } });
    else await prisma.notification.updateMany({ where: { userId: req.user!.sub }, data: { read: true } });
    res.json({ ok: true });
  }),
);
