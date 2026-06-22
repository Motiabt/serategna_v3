#!/bin/sh
set -e

echo "→ Applying database schema (prisma db push)…"
npx prisma db push --skip-generate --accept-data-loss

if [ "${SEED_ON_START}" = "true" ]; then
  echo "→ Seeding database…"
  npx tsx prisma/seed.ts || echo "seed skipped/failed (continuing)"
fi

echo "→ Starting Serategna API…"
exec "$@"
