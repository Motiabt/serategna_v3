// Flips the Prisma datasource provider to PostgreSQL for production/Docker
// builds while local dev keeps the zero-config SQLite default. Idempotent.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', 'prisma', 'schema.prisma');

let schema = readFileSync(schemaPath, 'utf8');
schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
writeFileSync(schemaPath, schema);
console.log('Prisma datasource set to postgresql.');
