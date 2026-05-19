#!/usr/bin/env bash
# One-shot production deploy: load .env, push schema, deploy SST, print URL.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env — copy from .env.example and fill in Supabase + NextAuth values."
  exit 1
fi

# Load .env (skip comments and empty lines)
set -a
# shellcheck disable=SC1091
source <(grep -v '^\s*#' .env | grep -v '^\s*$' | grep -v '^AWS_' | sed 's/\r$//')
set +a

required=(DATABASE_URL DIRECT_URL NEXTAUTH_SECRET NEXTAUTH_URL)
for v in "${required[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "Missing $v in .env"
    exit 1
  fi
done

echo "→ Pushing Prisma schema to Supabase…"
npm run db:push

echo "→ Deploying to AWS (SST prod)…"
npm run sst:deploy:prod

echo ""
echo "Done. Open the URL printed above."
echo "If sign-in fails, set NEXTAUTH_URL to that CloudFront URL in .env and run this script again."
