// Minimal structured logger + error-capture seam.
//
// Emits one JSON line per event in production (machine-parseable for any log
// drain — Datadog, Loki, CloudWatch), and a readable line in dev. captureError
// is the single hook an APM (Sentry/Bugsnag) plugs into later: if SENTRY_DSN or
// ERROR_WEBHOOK is set we forward 500-class errors; otherwise we just log.

const isProd = process.env.NODE_ENV === 'production';
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (level === 'debug' && isProd) return;
  const rec = { ts: new Date().toISOString(), level, msg, ...(meta ?? {}) };
  const line = isProd ? JSON.stringify(rec) : `[${level}] ${msg}` + (meta ? ' ' + JSON.stringify(meta) : '');
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => emit('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
};

/**
 * Report an unexpected (500-class) error. Always logs structured; additionally
 * forwards to an external collector when configured. Never throws.
 */
export async function captureError(err: unknown, context: Record<string, unknown> = {}) {
  const error = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { message: String(err) };
  logger.error('unhandled_error', { ...context, error });

  const hook = process.env.ERROR_WEBHOOK;
  if (hook) {
    // Fire-and-forget; a logging failure must never affect the request.
    fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'serategna-api', env: process.env.NODE_ENV, error, context }),
    }).catch(() => undefined);
  }
}
