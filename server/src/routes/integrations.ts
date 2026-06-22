import { Router } from 'express';
import { ah, authRequired } from '../middleware/auth.js';

export const integrationsRouter = Router();

// ── Integration status (which external services are wired) ───────────────────
integrationsRouter.get(
  '/status',
  authRequired,
  ah(async (_req, res) => {
    const env = process.env;
    res.json({
      payments: {
        adapter: env.PAYMENT_ADAPTER ?? 'mock',
        configured: !!env.CHAPA_SECRET_KEY || (env.PAYMENT_ADAPTER ?? 'mock') === 'mock',
        webhookSecured: !!env.CHAPA_WEBHOOK_SECRET,
        rails: ['telebirr', 'cbe_birr', 'card'],
      },
      maps: { provider: 'google', configured: !!env.GOOGLE_MAPS_ENABLED },
      sms: {
        provider: env.SMS_PROVIDER ?? 'console',
        configured:
          env.SMS_PROVIDER === 'ethiotelecom'
            ? !!env.ETHIOTEL_SMS_URL && (!!env.ETHIOTEL_TOKEN || (!!env.ETHIOTEL_USERNAME && !!env.ETHIOTEL_PASSWORD))
            : env.SMS_PROVIDER === 'twilio'
              ? !!env.SMS_ACCOUNT_SID && !!env.SMS_AUTH_TOKEN
              : env.SMS_PROVIDER === 'http'
                ? !!env.SMS_GATEWAY_URL && !!env.SMS_API_KEY
                : false,
      },
      push: { provider: 'fcm', configured: !!env.FCM_SERVER_KEY },
      telegram: { configured: !!env.TELEGRAM_BOT_TOKEN },
      identity: { provider: 'fayda_mosip', configured: !!env.MOSIP_API_KEY, manualFallback: true },
    });
  }),
);
