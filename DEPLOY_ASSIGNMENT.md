# Deploy for assignment (working public URL)

Your app deploys to **AWS** (Lambda + CloudFront) via **SST**, with **Supabase** as the database.

**Do not deploy from Windows CMD/Git Bash** — OpenNext fails on Windows. Use **GitHub Actions** (steps below) or **WSL** with Node 20.

---

## Step 1 — Fix Supabase database password (required)

`npm run db:push` fails with **P1000** until the password in `.env` is correct.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project **qgofdiippdlcbtbpqlas**
2. **Project Settings → Database → Reset database password** (pick a new password you will remember)
3. **Connection string → URI**:
   - **Transaction pooler** (port **6543**) → `DATABASE_URL`  
     Add: `?pgbouncer=true&connection_limit=1`
   - **Session mode** (port **5432**) → `DIRECT_URL`
4. Replace `[YOUR-PASSWORD]` in both URLs. If the password contains `@`, encode it as `%40`.
5. Update `.env` and test locally:

```bash
npm run db:push
```

You should see `Your database is now in sync with your Prisma schema`.

---

## Step 2 — Push code to GitHub

Create a repo on GitHub and push this project (do **not** commit `.env`).

```bash
git add .
git commit -m "Add deploy workflow"
git remote add origin https://github.com/YOUR_USER/Task-Mgmt.git
git push -u origin main
```

---

## Step 3 — GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|--------|
| `AWS_ACCESS_KEY_ID` | From IAM (see below) |
| `AWS_SECRET_ACCESS_KEY` | From IAM |
| `AWS_REGION` | `ap-south-1` |
| `DATABASE_URL` | Supabase pooled URI (port 6543) |
| `DIRECT_URL` | Supabase direct URI (port 5432) |
| `NEXTAUTH_SECRET` | Same as in your `.env` |
| `NEXTAUTH_URL` | `https://www.taskers.in` (after custom domain) |
| `CUSTOM_DOMAIN` | `www.taskers.in` (optional; defaults in SST config) |
| `ACM_CERT_ARN` | ACM cert ARN from **us-east-1** (after DNS validation) |

**IAM access key (for GitHub only):** IAM → Users → Create user → attach **AdministratorAccess** → Security credentials → Create access key → CLI. Use that key/secret in GitHub (not root keys in the repo).

---

## Step 4 — Run deploy

1. GitHub → **Actions** → **Deploy to AWS** → **Run workflow** (or push to `main`)
2. Wait ~10–15 minutes (Linux runner; avoids Windows OpenNext bug)
3. Open the workflow log; at the end SST prints your **URL** (CloudFront), e.g. `https://dxxxx.cloudfront.net`

---

## Step 5 — Fix login (NEXTAUTH_URL)

1. Copy the CloudFront URL from the deploy log
2. Update GitHub secret `NEXTAUTH_URL` to that URL (e.g. `https://dxxxx.cloudfront.net`)
3. Re-run the **Deploy to AWS** workflow once

---

## Step 6 — Custom domain (GoDaddy → www.taskers.in)

1. AWS Console → **ACM** → region **US East (N. Virginia)** → request cert for `taskers.in` and `www.taskers.in` (DNS validation).
2. Add the ACM validation CNAME records in GoDaddy DNS.
3. When the cert is **Issued**, copy its ARN and set:
   - `.env`: `ACM_CERT_ARN=arn:aws:acm:us-east-1:...`
   - GitHub secret: `ACM_CERT_ARN` (same value)
   - GitHub secret: `CUSTOM_DOMAIN` = `www.taskers.in`
   - GitHub secret: `NEXTAUTH_URL` = `https://www.taskers.in`
4. Redeploy (push to `main` or run the workflow).
5. In GoDaddy DNS: **CNAME** `www` → your CloudFront domain (`dxxxx.cloudfront.net` from deploy log).
6. Forward apex `taskers.in` → `https://www.taskers.in` in GoDaddy (optional but recommended).

---

## Step 7 — Share for evaluation

Submit the CloudFront URL. Evaluators should:

1. Open the URL
2. **Sign up** (create account)
3. Create a project and tasks

---

## If deploy failed halfway on your laptop

A partial SST stack may exist. After fixing secrets, either:

- Deploy via GitHub Actions (recommended), or
- Remove and retry: `npm run sst:deploy:prod` from **WSL** with Node 20 only

```bash
npx sst remove --stage prod   # only if you need a clean slate
```

---

## Checklist

- [ ] `npm run db:push` works locally
- [ ] Code on GitHub; `.env` **not** committed
- [ ] Six GitHub secrets set
- [ ] Deploy workflow succeeded
- [ ] `NEXTAUTH_URL` set to `https://www.taskers.in`; workflow re-run
- [ ] `ACM_CERT_ARN` set when using custom domain
- [ ] GoDaddy CNAME `www` → CloudFront; sign-up works on live URL
