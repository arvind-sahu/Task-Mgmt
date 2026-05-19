# GitHub secrets for arvind-sahu/Task-Mgmt

Open: https://github.com/arvind-sahu/Task-Mgmt/settings/secrets/actions

Click **New repository secret** for each row (copy values from your local `.env` and IAM).

| Secret name | Where to get the value |
|-------------|-------------------------|
| `AWS_ACCESS_KEY_ID` | IAM → Users → your deploy user → Security credentials → Access key |
| `AWS_SECRET_ACCESS_KEY` | Same access key creation flow |
| `AWS_REGION` | `ap-south-1` |
| `DATABASE_URL` | Your `.env` `DATABASE_URL` (Supabase pooled URL, port 6543, recommended for Lambda) |
| `DIRECT_URL` | Your `.env` `DIRECT_URL` |
| `NEXTAUTH_SECRET` | Your `.env` `NEXTAUTH_SECRET` |
| `NEXTAUTH_URL` | `http://localhost:3000` for the **first** deploy only |

Then run the workflow:

https://github.com/arvind-sahu/Task-Mgmt/actions/workflows/deploy.yml → **Run workflow**

After it finishes, copy the **CloudFront URL** from the log, update secret `NEXTAUTH_URL` to that URL, and **Run workflow** again.
