# GitHub secrets for arvind-sahu/Task-Mgmt

Open: https://github.com/arvind-sahu/Task-Mgmt/settings/secrets/actions

**Important:** use **Repository secrets** (the "Secrets" tab), NOT "Variables".
Names must match **exactly** (case-sensitive).

Click **New repository secret** for each row:

| Secret name (copy exactly) | Value |
|----------------------------|--------|
| `DATABASE_URL` | Full line from `.env` after `DATABASE_URL=` |
| `DIRECT_URL` | Full line from `.env` after `DIRECT_URL=` |
| `NEXTAUTH_SECRET` | From `.env` |
| `NEXTAUTH_URL` | `http://localhost:3000` (first deploy) |
| `AWS_ACCESS_KEY_ID` | IAM access key (not `AWS_ACCESS_KEY`) |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_REGION` | `ap-south-1` |

Common mistake: creating `AWS_ACCESS_KEY` — the workflow expects `AWS_ACCESS_KEY_ID`.

Then run the workflow:

https://github.com/arvind-sahu/Task-Mgmt/actions/workflows/deploy.yml → **Run workflow**

After it finishes, copy the **CloudFront URL** from the log, update secret `NEXTAUTH_URL` to that URL, and **Run workflow** again.
