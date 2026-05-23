#!/usr/bin/env bash
# Upload secrets to GitHub (Git Bash / WSL). From repo root:
#   bash scripts/set-github-secrets.sh

set -euo pipefail
cd "$(dirname "$0")/.."

REPO="${GITHUB_REPO:-arvind-sahu/Task-Mgmt}"

if [ -f "/c/Program Files/GitHub CLI/gh.exe" ]; then
  GH="/c/Program Files/GitHub CLI/gh.exe"
elif command -v gh >/dev/null 2>&1; then
  GH="gh"
else
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

"$GH" auth status >/dev/null 2>&1 || { echo "Run: \"$GH\" auth login"; exit 1; }

set -a
# shellcheck disable=SC1091
source <(grep -v '^\s*#' .env | grep -v '^\s*$' | sed 's/\r$//')
set +a

set_secret() {
  printf '%s' "$2" | "$GH" secret set "$1" --repo "$REPO"
  echo "Set $1"
}

read -r -p "Supabase database password (plain): " SUPABASE_DB_PASSWORD
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "Error: password cannot be empty."
  exit 1
fi
read -r -p "AWS_ACCESS_KEY_ID: " AWS_ACCESS_KEY_ID
read -r -s -p "AWS_SECRET_ACCESS_KEY: " AWS_SECRET_ACCESS_KEY
echo
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "Error: AWS credentials cannot be empty."
  exit 1
fi

set_secret SUPABASE_PROJECT_REF "qgofdiippdlcbtbpqlas"
set_secret SUPABASE_DB_PASSWORD "$SUPABASE_DB_PASSWORD"
set_secret NEXTAUTH_SECRET "${NEXTAUTH_SECRET:?missing in .env}"
set_secret NEXTAUTH_URL "${NEXTAUTH_URL:-http://localhost:3000}"
if [ -n "${AUTH_GITHUB_ID:-}" ]; then set_secret AUTH_GITHUB_ID "$AUTH_GITHUB_ID"; fi
if [ -n "${AUTH_GITHUB_SECRET:-}" ]; then set_secret AUTH_GITHUB_SECRET "$AUTH_GITHUB_SECRET"; fi
if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then set_secret GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID"; fi
if [ -n "${GOOGLE_CLIENT_SECRET:-}" ]; then set_secret GOOGLE_CLIENT_SECRET "$GOOGLE_CLIENT_SECRET"; fi
set_secret AWS_ACCESS_KEY_ID "$AWS_ACCESS_KEY_ID"
set_secret AWS_SECRET_ACCESS_KEY "$AWS_SECRET_ACCESS_KEY"
set_secret AWS_REGION "ap-south-1"

echo "Done: https://github.com/$REPO/settings/secrets/actions"
