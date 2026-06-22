// Provision a clean, isolated SQLite database for the test run, then seed it.
// Run automatically by `npm test` before vitest.
import { execSync } from 'node:child_process';

const env = { ...process.env, DATABASE_URL: 'file:./test.db', NODE_ENV: 'test' };
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });

console.log('[test-db] resetting test.db and applying schema…');
run('npx prisma db push --skip-generate --force-reset');
console.log('[test-db] seeding…');
run('npx tsx prisma/seed.ts');
console.log('[test-db] ready.');
