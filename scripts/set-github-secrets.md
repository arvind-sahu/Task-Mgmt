# GitHub secrets (arvind-sahu/Task-Mgmt)

## Easiest: 2 database secrets (recommended)

The workflow builds the connection string for you.

| Secret name | Value |
|-------------|--------|
| `SUPABASE_PROJECT_REF` | `qgofdiippdlcbtbpqlas` |
| `SUPABASE_DB_PASSWORD` | Your Supabase DB password **plain** (e.g. `Supabase@2k25`) — not URL-encoded |

Plus these (if not already set):

| Secret name | Value |
|-------------|--------|
| `NEXTAUTH_SECRET` | from `.env` |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_REGION` | `ap-south-1` |

Add at: https://github.com/arvind-sahu/Task-Mgmt/settings/secrets/actions  
Tab: **Secrets** → **Repository secrets** (NOT Variables).

---

## Or use PowerShell script

```powershell
cd C:\Users\ASUS\Desktop\Assignment\Task-Mgmt
& "${env:ProgramFiles}\GitHub CLI\gh.exe" auth login
.\scripts\set-github-secrets.ps1
```

---

## Or Git Bash

```bash
"/c/Program Files/GitHub CLI/gh.exe" auth login
bash scripts/set-github-secrets.sh
```
