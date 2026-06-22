import { Request } from 'express';
import { prisma } from './prisma.js';

/** Append a tamper-evident audit record for sensitive/admin actions (spec E1). */
export async function audit(
  req: Request,
  action: string,
  target?: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  await prisma.auditLog
    .create({
      data: { actorId: req.user?.sub ?? null, action, target: target ?? null, meta: JSON.stringify(meta), ip },
    })
    .catch(() => undefined);
}
