# ── Serategna API — multi-stage build ────────────────────────────────────────
# Debian-slim (not alpine): Prisma's supported happy path. Alpine's musl + the
# OpenSSL-version mis-detection breaks the query/schema engines on Render.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
# Target Postgres for the container image, then generate client + compile TS.
RUN node scripts/use-postgres.mjs && npx prisma generate && npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
# Bring compiled output, generated Prisma client, schema and entrypoint.
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./
# Create the non-root user and give it ownership of /app, so `prisma db push`
# at runtime can read/write node_modules/@prisma/engines (the cause of the
# "Can't write to … please make sure you install prisma with the right
# permissions" error).
RUN chmod +x docker-entrypoint.sh && \
    addgroup --system app && adduser --system --ingroup app app && \
    chown -R app:app /app
USER app
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
