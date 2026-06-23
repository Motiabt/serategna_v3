import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';
import { authRouter } from './routes/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { jobsRouter } from './routes/jobs.js';
import { walletRouter } from './routes/wallet.js';
import { identityRouter } from './routes/identity.js';
import { ratingsRouter } from './routes/ratings.js';
import { disputesRouter } from './routes/disputes.js';
import { sosRouter } from './routes/sos.js';
import { scoreRouter } from './routes/score.js';
import { catalogRouter } from './routes/catalog.js';
import { adminRouter } from './routes/admin.js';
import { aiRouter } from './routes/ai.js';
import { contractsRouter } from './routes/contracts.js';
import { guarantorsRouter } from './routes/guarantors.js';
import { legalRouter } from './routes/legal.js';
import { paymentsRouter } from './routes/payments.js';
import { integrationsRouter } from './routes/integrations.js';
import { notificationsRouter } from './routes/notifications.js';
import { savedRouter } from './routes/saved.js';
import { subscriptionRouter } from './routes/subscription.js';
import { publicRouter } from './routes/public.js';
import { credentialsRouter } from './routes/credentials.js';
import { enterpriseRouter } from './routes/enterprise.js';
import { creditRouter } from './routes/credit.js';
import { safetyRouter } from './routes/safety.js';
import { savingsRouter } from './routes/savings.js';
import { notFound, errorHandler } from './middleware/error.js';
import { cacheControl } from './middleware/cache.js';

export const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({
    // API serves JSON only; lock the CSP right down and harden transport.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }),
);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: '256kb',
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
    },
  }),
);
// Correlate every request: attach an id, echo it back, and tag access logs.
app.use((req, res, next) => {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  (req as { id?: string }).id = id;
  res.setHeader('x-request-id', id);
  next();
});
morgan.token('id', (req) => (req as { id?: string }).id ?? '-');
// Quiet logs during automated tests.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(config.isProd ? ':id :method :url :status :response-time ms' : 'dev'));
}

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true });
// Tighter cap specifically on OTP issuance (anti-SMS-bombing / brute force).
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });
// Strict cap on money-moving mutations (advances, payouts, subscription billing)
// — limits abuse / automated draining well below the general API budget.
const moneyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, standardHeaders: true });

// API versioning: `/api/v1/*` is the versioned surface; `/api/*` is kept as a
// back-compat alias. Rewriting the prefix here lets every router serve both.
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/v1/')) req.url = '/api/' + req.url.slice('/api/v1/'.length);
  else if (req.url === '/api/v1') req.url = '/api';
  next();
});

// Liveness: process is up. Readiness: can we actually reach the database?
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'serategna-api', ts: Date.now() }));
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: 'up' });
  } catch (err) {
    logger.error('readiness_failed', { error: err instanceof Error ? err.message : String(err) });
    res.status(503).json({ status: 'not-ready', db: 'down' });
  }
});

// In tests the limiters are disabled so repeated logins don't trip throttles.
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth/otp', otpLimiter);
  app.use('/api/auth', authLimiter);
  // Money-moving endpoints get a much stricter budget (mounted before the
  // general limiter so the tighter cap applies to these paths).
  app.use('/api/credit/advance', moneyLimiter);
  app.use('/api/wallet/payouts', moneyLimiter);
  app.use('/api/subscription/subscribe', moneyLimiter);
  app.use('/api', apiLimiter);
}
app.use('/api/auth', authRouter);
app.use('/api', profilesRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/identity', identityRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/disputes', disputesRouter);
app.use('/api/sos', sosRouter);
app.use('/api/score', scoreRouter);
app.use('/api/catalog', cacheControl(3600), catalogRouter); // static reference data — cacheable 1h
app.use('/api/ai', aiRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/guarantors', guarantorsRouter);
app.use('/api/legal', legalRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/saved', savedRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/public', publicRouter);
app.use('/api/credentials', credentialsRouter);
app.use('/api/enterprise', enterpriseRouter);
app.use('/api/credit', creditRouter);
app.use('/api/safety', safetyRouter);
app.use('/api/savings', savingsRouter);
app.use('/api/admin', adminRouter);

app.use(notFound);
app.use(errorHandler);
