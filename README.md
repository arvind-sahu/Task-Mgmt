# Tasker — Task Management & Collaboration Tool

A small, end-to-end task management app built on the **T3 stack** (Next.js +
TypeScript + Tailwind + tRPC + NextAuth + Prisma) with a **PostgreSQL
(Supabase)** database and **serverless deployment to AWS via SST v3**.

---

## Features

- **Email + password auth** (NextAuth Credentials provider, bcrypt-hashed
  passwords, JWT sessions).
- **Projects** with members and roles (`OWNER`, `ADMIN`, `MEMBER`).
- **Tasks** with status (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`),
  priority (`LOW` → `URGENT`), deadline, multiple assignees, tags, and a
  rich description.
- **Kanban board** per project with drag-and-drop status changes (with
  optimistic UI).
- **Comments** for task-level collaboration.
- **Tags**, color-coded and scoped per project.
- **Dashboard** with open / in-progress / overdue counts and your upcoming
  tasks across all projects.
- **User profile** for name, bio, avatar URL, and timezone.
- **End-to-end type safety** with tRPC + Zod.
- **Unit tests** for utilities, password verification, the access-control
  helper, and the user registration mutation (Vitest).

---

## Tech stack

| Layer        | Tool                                                                  |
| ------------ | --------------------------------------------------------------------- |
| Framework    | [Next.js 14 — Pages Router](https://nextjs.org)                       |
| Language     | TypeScript                                                            |
| Styling      | Tailwind CSS                                                          |
| API          | [tRPC v11](https://trpc.io) + Zod                                     |
| Auth         | [NextAuth.js v4](https://next-auth.js.org) (Credentials, JWT)         |
| ORM          | [Prisma](https://prisma.io)                                           |
| Database     | PostgreSQL — [Supabase](https://supabase.com) in production           |
| Deployment   | [SST v3 (ion)](https://sst.dev) → AWS (Lambda + CloudFront)           |
| Testing      | [Vitest](https://vitest.dev)                                          |
| Bootstrapped | `npm create t3-app@7.37.0`                                            |

---

## Architecture

```
┌────────────────────────────────────────┐
│              CloudFront                │  ← public URL
└──────────────┬─────────────────────────┘
               │
        ┌──────▼──────┐
        │  Next.js    │  Pages router pages + API routes
        │  on Lambda  │  (tRPC + NextAuth + tRPC server callers)
        └──────┬──────┘
               │ (Prisma)
        ┌──────▼──────────┐
        │  Supabase Postgres │ pooled (pgbouncer) for runtime,
        │                    │ direct connection for migrations
        └────────────────────┘
```

### Source layout

```
prisma/schema.prisma          # Postgres schema + Prisma models
sst.config.ts                 # SST v3 config (Next.js -> AWS)
Dockerfile                    # Multi-stage prod image (Next standalone)
docker-compose.yml            # Local Postgres (+ optional `app` profile)
.github/workflows/
  ci.yml                      # Lint + typecheck + test + build + docker
  deploy.yml                  # Prisma migrate + SST deploy via AWS OIDC

src/
  components/                 # Reusable UI (Layout, Badges, TaskCard, TaskForm, EmptyState)
  pages/
    api/auth/[...nextauth].ts # NextAuth handler
    api/trpc/[trpc].ts        # tRPC HTTP handler
    auth/{signin,signup}.tsx  # Email/password auth pages
    projects/{index,[id]}.tsx # List + Kanban detail
    tasks/[id].tsx            # Task detail + comments
    profile.tsx               # User profile / preferences
    dashboard.tsx             # Overview
  server/
    auth.ts                   # NextAuth options + verifyPassword()
    db.ts                     # Singleton Prisma client
    api/
      access.ts               # assertProjectAccess() — RBAC helper
      root.ts                 # appRouter
      routers/                # user, project, task, tag, comment
      trpc.ts                 # context, procedures, middleware
  utils/
    api.ts                    # tRPC React client
    date.ts                   # Date formatting / "is overdue" helpers
  styles/globals.css          # Tailwind base + reusable component classes
```

### Data model (high-level)

- `User 1—* Project (owner)` and `User *—* Project (members via ProjectMember)`
- `Project 1—* Task`
- `Task *—* User (assignees)` and `Task *—* Tag`
- `Task 1—* Comment` (`Comment *—1 User`)

See `prisma/schema.prisma` for the full schema, including NextAuth's
`Account`, `Session`, and `VerificationToken` tables (kept so OAuth providers
can be added later without a migration).

---

## Local setup

### 1. Prerequisites

- Node.js 20+
- Docker (for the bundled local Postgres) **or** a Supabase project

### 2. Install

```bash
npm install
```

### 3. Configure env

```bash
cp .env.example .env
# then edit .env
```

The env variables are validated at runtime by `src/env.js` — see that file
or `.env.example` for the full list. Generate a real `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

### 4. Database

**Option A — local Postgres in Docker (recommended for dev):**

The repo ships with a `docker-compose.yml` that runs `postgres:16-alpine` with
a healthcheck and a persistent named volume. The default credentials match
what's in `.env.example`, so this just works:

```bash
npm run db:start          # = docker compose up -d  +  wait healthy  +  prisma db push
# or, equivalently:
docker compose up -d
npm run db:wait
npm run db:push           # apply Prisma schema
```

Useful related scripts:

| Command              | What it does                                    |
| -------------------- | ----------------------------------------------- |
| `npm run db:up`      | Start the Postgres container                    |
| `npm run db:down`    | Stop it (data persists in the named volume)     |
| `npm run db:logs`    | Tail Postgres logs                              |
| `npm run db:reset`   | Tear down + delete the volume + bring it back up (fresh DB) |
| `npm run db:wait`    | Block until the container reports `pg_isready`  |
| `npm run db:studio`  | Open Prisma Studio against the running DB       |

You can also run `./start-database.sh` for a single-step start + wait.

**Option B — Supabase (for staging/prod or anyone without Docker):**

1. Create a new project at https://supabase.com.
2. Go to **Project Settings → Database → Connection string** and grab:
   - the **pooled** connection (port `6543`, with `?pgbouncer=true&connection_limit=1`) → `DATABASE_URL`
   - the **direct** connection (port `5432`) → `DIRECT_URL`
3. Update your `.env` (the placeholders in `.env.example` show the format).
4. Run migrations:

   ```bash
   npm run db:push
   ```

### 5. Run

```bash
npm run dev
# open http://localhost:3000
```

Sign up at `/auth/signup`, then create a project and start adding tasks.

### 6. (Optional) Run the production-mode container locally

A multi-stage [`Dockerfile`](./Dockerfile) builds a ~190 MB image that mirrors
what runs in production. Bring it up with the rest of the stack:

```bash
# DB only (default profile)
docker compose up -d
# Initialize the schema once from the host:
npm run db:push
# Now bring up the app container too:
docker compose --profile app up -d --build
# → http://localhost:3000
```

Or build / run the image standalone:

```bash
docker build -t tasker:local .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://postgres:password@host.docker.internal:5432/demo \
  -e DIRECT_URL=postgresql://postgres:password@host.docker.internal:5432/demo \
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -e NEXTAUTH_URL=http://localhost:3000 \
  tasker:local
```

---

## Testing

Unit tests live next to the code they cover (`*.test.ts`):

- `src/utils/date.test.ts` — date helpers
- `src/server/auth.test.ts` — `verifyPassword` + Zod schema
- `src/server/api/access.test.ts` — RBAC checks
- `src/server/api/routers/user.test.ts` — `user.register` (creates a tRPC
  caller with a mocked Prisma client and asserts the password is hashed
  before persistence)

Run them:

```bash
npm test            # one-shot
npm run test:watch  # watch mode
```

Type-check the whole project:

```bash
npm run typecheck
```

---

## Deployment

The app is configured to deploy as a **Next.js Lambda site fronted by
CloudFront** using **SST v3**, all driven from **GitHub Actions**. The
production database is **Supabase Postgres** (free tier).

Two workflows under `.github/workflows`:

| Workflow            | Triggers                       | What it does                                                       |
| ------------------- | ------------------------------ | ------------------------------------------------------------------ |
| `ci.yml`            | every push / PR to `main`      | lint → typecheck → vitest → `next build` against ephemeral Postgres + builds the Docker image |
| `deploy.yml`        | push to `main` (or manual)     | applies pending Prisma migrations → `sst deploy --stage prod` via OIDC |

### Free-tier sizing

The default deploy fits comfortably in AWS Free Tier for low traffic:

- **Lambda** — 1M free requests / month, 400k GB-seconds compute.
- **CloudFront** — 1 TB egress + 10M HTTPS requests / month for the first 12 months.
- **S3** (used by SST for static assets) — 5 GB.
- **Supabase free tier** — 500 MB DB, 2 GB egress / month, no cold starts on the connection pooler.

### One-time AWS setup (≈ 10 minutes)

#### 1. Create a Supabase database

1. Sign up / sign in at <https://supabase.com> and create a new project.
   Pick a region close to your AWS region (e.g. `aws-0-us-east-1`).
2. **Project Settings → Database → Connection string** — copy:
   - **pooled** (port `6543`, append `?pgbouncer=true&connection_limit=1`) → save as `DATABASE_URL`
   - **direct** (port `5432`) → save as `DIRECT_URL`

#### 2. Create the AWS OIDC provider for GitHub

This lets GitHub Actions assume an IAM role without storing long-lived AWS keys.
Run once (replace your account id):

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

Or via the console: **IAM → Identity providers → Add provider → OIDC**,
provider URL `https://token.actions.githubusercontent.com`, audience
`sts.amazonaws.com`.

#### 3. Create the deploy IAM role

The trust policy must scope the role to **only this GitHub repo** so a forked
PR can't claim it. Replace `<ACCOUNT_ID>` and `<OWNER>/<REPO>`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:ref:refs/heads/main" }
    }
  }]
}
```

Save it as `trust.json`, then:

```bash
aws iam create-role \
  --role-name tasker-github-deploy \
  --assume-role-policy-document file://trust.json

# AdministratorAccess is the simplest fit for the assignment. For real
# workloads narrow this to the policies SST + Next.js need (CloudFormation,
# Lambda, S3, CloudFront, IAM PassRole, Logs, SSM).
aws iam attach-role-policy \
  --role-name tasker-github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Print the role ARN — you'll paste it into a GitHub secret next.
aws iam get-role --role-name tasker-github-deploy --query Role.Arn --output text
```

#### 4. Add GitHub repository secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret                | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN` | ARN printed above (e.g. `arn:aws:iam::123:role/tasker-github-deploy`) |
| `AWS_REGION`          | e.g. `us-east-1`                                            |
| `DATABASE_URL`        | Supabase pooled URL                                         |
| `DIRECT_URL`          | Supabase direct URL                                         |
| `NEXTAUTH_SECRET`     | output of `openssl rand -base64 32`                         |
| `NEXTAUTH_URL`        | leave empty for the first run; update after step 6          |

(Optional) Create a `production` GitHub Environment if you want the deploy job
gated behind manual approval — `deploy.yml` already references it.

#### 5. Push to `main` to deploy

```bash
git push origin main
```

GitHub Actions will:

1. Apply pending Prisma migrations against Supabase (or `db push` on first deploy).
2. Run `sst deploy --stage prod`, which uploads assets to S3 and creates the
   Lambda + CloudFront distribution.
3. Print the deployed URL at the end of the run.

#### 6. Set `NEXTAUTH_URL`

Take the CloudFront URL from the deploy logs (or your custom domain) and put
it into the `NEXTAUTH_URL` GitHub secret, then re-run the workflow. NextAuth
needs this to set cookies correctly; without it, sign-in will redirect to
`localhost`.

#### 7. (Optional) Custom domain

Uncomment the `domain` block in `sst.config.ts`, push, and SST will create
the ACM certificate and CloudFront alias for you. Point your DNS `CNAME` to
the new distribution.

### Manual / local deploy

If you'd rather deploy from your laptop:

```bash
aws configure                             # one-time, creates ~/.aws/credentials
export DATABASE_URL=... DIRECT_URL=... \
       NEXTAUTH_SECRET=... NEXTAUTH_URL=...
npm run sst:deploy:prod                   # equivalent to `sst deploy --stage prod`
```

### Free-tier checklist

- Stay in **one region** to avoid duplicate CloudFront/edge costs.
- The SST removal policy is `remove` for non-prod stages and `retain` for
  `prod` — accidentally tearing down `prod` won't delete data.
- Watch the AWS Billing dashboard the first week; the largest expected cost
  outside free tier is **CloudFront egress** if you ship lots of static assets.

---

## Useful scripts

| Command                  | What it does                                |
| ------------------------ | ------------------------------------------- |
| `npm run dev`            | Next.js dev server                          |
| `npm run build`          | Production Next.js build                    |
| `npm run start`          | Run the prod build locally                  |
| `npm run lint`           | ESLint                                      |
| `npm run typecheck`      | TypeScript no-emit check                    |
| `npm test`               | Vitest one-shot                             |
| `npm run test:watch`     | Vitest watch mode                           |
| `npm run db:up`          | Start the Postgres Docker container         |
| `npm run db:down`        | Stop the Docker container                   |
| `npm run db:reset`       | Tear down + recreate (fresh data)           |
| `npm run db:logs`        | Tail Postgres logs                          |
| `npm run db:wait`        | Wait until Postgres is ready                |
| `npm run db:start`       | `db:up` + `db:wait` + `db:push`             |
| `npm run db:push`        | Push Prisma schema to the database          |
| `npm run db:generate`    | Create a new migration (`prisma migrate dev`) |
| `npm run db:migrate`     | Apply migrations in production (`migrate deploy`) |
| `npm run db:studio`      | Open Prisma Studio                          |
| `npm run sst:dev`        | SST live dev                                |
| `npm run sst:deploy`     | SST deploy (default stage)                  |
| `npm run sst:deploy:prod`| SST deploy to `prod` stage                  |

---

## Security notes

- Passwords are hashed with bcrypt (cost factor 10) and never returned from
  any tRPC procedure.
- Session strategy is JWT (required by Credentials provider). A user's id is
  embedded into the token and surfaced as `session.user.id` so authz checks
  in tRPC are trivial.
- Every project-scoped router endpoint goes through `assertProjectAccess`
  to enforce membership and (where appropriate) role-based access. See
  `src/server/api/access.ts`.
- Email lookups are case-insensitive (we lowercase before storing/querying).

---

## License

MIT
