import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config.js';

export interface AccessPayload {
  sub: string;
  phone: string;
  roles: { worker: boolean; client: boolean; agent: boolean; admin: boolean };
  tier: number;
  mfa?: boolean; // second factor (TOTP) satisfied this session
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessPayload;
}

export function signRefreshToken(userId: string): string {
  // jti makes every refresh token unique (so rapid re-logins never collide on
  // the unique token column) and supports per-token revocation.
  return jwt.sign({ sub: userId, jti: randomUUID() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTtl,
  });
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { sub: string };
}
