#!/usr/bin/env bash
# Convenience wrapper around `docker compose` for the local Postgres.
#
# This used to be a hand-rolled `docker run` script. We now use a proper
# `docker-compose.yml` so we get a named volume, healthchecks, and easy
# lifecycle management. The script is kept for backwards compatibility and
# anyone who prefers `./start-database.sh` over `npm run db:up`.
#
# Equivalent npm scripts:
#   npm run db:up      # start
#   npm run db:down    # stop
#   npm run db:reset   # nuke + start fresh
#   npm run db:start   # start, wait for ready, then `prisma db push`

set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Install it first: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required (try: docker compose version)."
  exit 1
fi

cd "$(dirname "$0")"

echo "Starting Postgres via docker compose…"
docker compose up -d

echo "Waiting for Postgres to be ready…"
until docker compose exec -T db pg_isready -U postgres -d demo >/dev/null 2>&1; do
  sleep 1
done

echo "Postgres is up at postgresql://postgres:password@localhost:5432/demo"
echo "Tip: run 'npm run db:push' to apply the Prisma schema."
