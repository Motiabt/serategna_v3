import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessPayload } from '../lib/jwt.js';
import { config } from '../config.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessPayload;
    }
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.roles.admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  // When enforced (prod), admin actions require a satisfied second factor (TOTP).
  if (config.requireAdmin2fa && !req.user.mfa) {
    return res.status(403).json({ error: 'Two-factor authentication required for admin access. Enrol an authenticator app.' });
  }
  next();
}

/** Wrap async handlers so thrown errors hit the error middleware. */
export function ah<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
