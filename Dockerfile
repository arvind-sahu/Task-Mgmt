# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# Tasker — Next.js (Pages Router) production image.
#
# Multi-stage build:
#   1. deps     — install only what's needed to build, cache via package-lock
#   2. builder  — generate Prisma client, run `next build` (standalone output)
#   3. runner   — minimal runtime image (alpine + non-root user)
#
# Build:
#   docker build -t tasker:local .
#
# Run (talks to the docker-compose Postgres on the same host network):
#   docker run --rm -p 3000:3000 \
#     -e DATABASE_URL=... \
#     -e DIRECT_URL=... \
#     -e NEXTAUTH_SECRET=... \
#     -e NEXTAUTH_URL=http://localhost:3000 \
#     tasker:local
#
# `docker compose up` will also start it alongside Postgres. See
# docker-compose.yml.
# ---------------------------------------------------------------------------

# 1. ---------- deps -----------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy lockfile + manifest separately so they form their own cache layer.
COPY package.json package-lock.json ./
COPY prisma ./prisma

# `--ignore-scripts` skips Prisma's `postinstall` which is re-run in the
# builder stage when the full source is available. Keeps this layer cacheable.
RUN npm ci --ignore-scripts


# 2. ---------- builder --------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
# `next build` runs `next.config.js` which validates env vars; we don't have
# real ones at build time, so ask the env validator to skip.
ENV SKIP_ENV_VALIDATION=1
# Tell next.config.js to enable Next's standalone output. Plain `next start`
# (used in `npm run start`) is incompatible with standalone, so we keep it
# off by default and only flip it on inside the Docker build.
ENV BUILD_STANDALONE=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate \
 && npm run build


# 3. ---------- runner ---------------------------------------------------
FROM node:20-alpine AS runner
# `openssl` is required by the Prisma query engine at runtime. `libc6-compat`
# helps Node's posix shims on alpine.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone output already bundles minimal node_modules + server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets and public files are not part of standalone — copy them in.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma migrations are useful at runtime if you want to run `prisma migrate deploy`
# inside the container; safe to ship.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

# server.js is created by Next.js when output: 'standalone' is set.
CMD ["node", "server.js"]
