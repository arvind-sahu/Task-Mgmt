#!/usr/bin/env bash
# One-shot production deploy: load .env, push schema, deploy SST, print URL.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env — copy from .env.example and fill in Supabase + NextAuth values."
  exit 1
fi

# Load .env safely (skip comments/empty lines). This parser preserves
# special characters in values (e.g. '&' in DATABASE_URL query params).
while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
  line="$(printf '%s' "$raw_line" | sed 's/\r$//')"
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  # Trim surrounding whitespace on key and value.
  key="$(printf '%s' "$key" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
  value="$(printf '%s' "$value" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"

  [[ -z "$key" ]] && continue

  export "$key=$value"
done < .env

required=(DATABASE_URL DIRECT_URL NEXTAUTH_SECRET NEXTAUTH_URL)
for v in "${required[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "Missing $v in .env"
    exit 1
  fi
done

# Prefer credentials from `aws configure` for local deploys to avoid stale
# values in .env causing signature failures.
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_REGION AWS_DEFAULT_REGION

echo "→ Pushing Prisma schema to Supabase…"
npm run db:push

echo "→ Deploying to AWS (SST prod)…"
npm run sst:deploy:prod

echo ""
echo "Done. Open the URL printed above."
echo "If sign-in fails, set NEXTAUTH_URL to that CloudFront URL in .env and run this script again."
