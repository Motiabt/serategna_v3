import { PrismaClient } from '@prisma/client';

// Defense-in-depth: the most sensitive columns are GLOBALLY omitted from every
// query result, so they can never accidentally leak — even if a future endpoint
// returns a raw user row. Reads that genuinely need them (auth 2FA verify, the
// audited DPO export) opt back in per-query with `omit: { totpSecret: false }`.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  omit: {
    user: { totpSecret: true, faydaNumber: true },
  },
});
