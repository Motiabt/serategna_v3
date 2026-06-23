import { app } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
import { smsConfigured } from './lib/sms.js';

const server = app.listen(config.port, () => {
  console.log(`\n  ሰራተኛ  Serategna API  ·  http://localhost:${config.port}`);
  console.log(`  env=${config.env}  ·  cors=${config.corsOrigins.join(', ')}`);
  console.log(`  sms=${smsConfigured ? process.env.SMS_PROVIDER : 'console (dev)'}  ·  otpDevMode=${config.otpDevMode}\n`);
});

// Graceful shutdown: stop accepting connections, then drain the DB pool. Under
// orchestration (Docker/K8s) a rolling deploy sends SIGTERM — without this the
// Postgres connection pool can be exhausted by abandoned connections.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n  ${signal} received — shutting down gracefully…`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
  // Failsafe: don't hang forever if connections won't close.
  setTimeout(() => process.exit(1), 10_000).unref();
}
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => shutdown(sig));
