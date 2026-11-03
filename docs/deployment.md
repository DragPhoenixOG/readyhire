# Deploying Readyhire

The recommended production setup keeps data in India and needs no servers to manage:

| Piece     | Service                                      | Why                                                                    | Approx. cost                     |
| --------- | -------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| App       | **Vercel Pro**, functions in Mumbai (`bom1`) | Preview deploy per pull request, instant rollbacks, frequent cron jobs | $20 / month per seat             |
| Database  | **Supabase Postgres**, Mumbai (`ap-south-1`) | Managed backups and connection pooling                                 | $25 / month (Pro)                |
| Documents | **AWS S3**, Mumbai (`ap-south-1`), private   | Encrypted at rest, browser uploads via pre-signed URLs, pennies per GB | ~$1 / month                      |
| Email     | **Resend**                                   | Simple API, good deliverability                                        | Free up to 3,000/month, then $20 |

Everything goes through standard interfaces (PostgreSQL, the S3 API, SMTP/HTTP email), so any piece can be swapped
by changing environment variables: Neon or AWS RDS for the database, Cloudflare R2 for documents, AWS SES or any SMTP
provider for email, or the Docker image on AWS, Railway, Render or a VM instead of Vercel.

Set up a **staging** copy of each piece (a second Supabase project, a second bucket) for Vercel preview deployments.

---

## Starting on free tiers (beta)

The repository is currently configured for this cheaper setup, to get real users on before paying for everything:

| Piece     | Service                                    | Notes                                                              |
| --------- | ------------------------------------------ | ------------------------------------------------------------------ |
| App       | **Vercel Hobby**, functions in Singapore   | Free, but not for commercial use; cron jobs run at most once a day |
| Database  | **Neon**, AWS Singapore (`ap-southeast-1`) | Free tier; same region as the functions so queries stay fast       |
| Documents | **Cloudflare R2**, Asia-Pacific, private   | Free up to 10 GB with no download fees; same S3 API as AWS         |
| Email     | **Gmail SMTP** with an app password        | Sends to anyone without owning a domain; about 500 emails a day    |
| Domain    | `<project>.vercel.app`                     | Add your own domain later (step 4.4)                               |

Differences from the steps below:

- **Database:** create a separate Neon project for production (never reuse the development database). Use the
  **pooled** connection string (host contains `-pooler`) for `DATABASE_URL` and the direct one for `DIRECT_URL`.
- **Documents (Cloudflare R2):** in the Cloudflare dashboard open **R2** (activating it may ask for a card; nothing
  is charged within the free tier) → **Create bucket**, location hint **Asia-Pacific**. In the bucket's **Settings →
  CORS policy**, add the same rule as step 2 with your `https://<project>.vercel.app` origin. Then **R2 → Manage API
  tokens → Create API token** with **Object Read & Write** on that bucket only. Set `STORAGE_DRIVER=s3`,
  `S3_BUCKET=<bucket>`, `S3_REGION=auto`, `S3_ENDPOINT=https://<account id>.r2.cloudflarestorage.com` and the token's
  `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`. To move to AWS later, copy the objects across (for example with
  `rclone sync`) and change these variables; nothing in the database changes.
- **Email:** turn on 2-Step Verification for the Google account, create an app password
  (Google Account → Security → App passwords), then set `EMAIL_DRIVER=smtp`,
  `SMTP_URL=smtps://you%40gmail.com:<app password without spaces>@smtp.gmail.com:465` (the `@` in the address is
  written `%40`) and `EMAIL_FROM="Readyhire <you@gmail.com>"`.
- **Reminders:** `vercel.json` runs `/api/cron/reminders` daily at 09:00 IST. Recruiters still get the reply
  reminders, just up to a day later than with a frequent schedule; overdue recruiters are blocked from posting jobs
  immediately either way. Interview reminders (a day and two hours before) need the endpoint to run every 15
  minutes, which Hobby can't do, so add a free external scheduler such as [cron-job.org](https://cron-job.org): a
  job every 15 minutes that calls `GET https://<your app>/api/cron/reminders` with the header
  `Authorization: Bearer <CRON_SECRET>`. Running it more often is safe; every email is sent once.
- **Preview deployments:** set the environment variables for **Production only**, so previews can never reach the
  production database. Previews will show a configuration error until a staging database exists.

Moving to the recommended setup later: switch Vercel to Pro, set the cron to every 15 minutes (`"*/15 * * * *"`) and
drop the external scheduler, and if the database moves to Mumbai, set `regions` back to `["bom1"]` so the app runs
next to it.

---

## 1. Database — Supabase

1. Create a project in **South Asia (Mumbai)**. Save the database password.
2. In **Project Settings → Database → Connection string**, copy:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL`
   - **Session pooler** (port `5432`) → `DIRECT_URL` (used only for migrations)
3. Enable daily backups (included in Pro) and consider point-in-time recovery.

Migrations run automatically on every production deploy (`scripts/vercel-build.mjs`). To run them by hand:

```bash
DIRECT_URL="<session pooler url>" npx prisma migrate deploy
```

## 2. Documents — AWS S3 (Mumbai)

1. Create a bucket, e.g. `readyhire-documents`, in **ap-south-1**. Keep **Block all public access** on and default
   encryption (SSE-S3) enabled.
2. **Permissions → CORS** — the browser uploads straight to the bucket:

   ```json
   [
     {
       "AllowedOrigins": ["https://readyhire.in"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

   Use your real domain(s). For the staging bucket, add your staging domain instead.

3. Create an IAM user (or role) for the app with only this policy, and create an access key for it:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::readyhire-documents/candidates/*"
       }
     ]
   }
   ```

4. Environment: `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION=ap-south-1`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.

> **Other providers.** Cloudflare R2: set `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`,
> `S3_REGION=auto` and configure the same CORS rules. Any provider works as long as it supports pre-signed `PUT` uploads
> from the browser (with CORS) and pre-signed `GET`s.

## 3. Email — Resend

1. Add and verify your sending domain (e.g. `readyhire.in`): add the SPF and DKIM DNS records Resend shows.
2. Create an API key with **Sending access**.
3. Environment: `EMAIL_DRIVER=resend`, `RESEND_API_KEY`, `EMAIL_FROM="Readyhire <no-reply@readyhire.in>"`.

To use AWS SES or another provider instead: `EMAIL_DRIVER=smtp` and
`SMTP_URL=smtps://<user>:<password>@<host>:465`.

## 4. App — Vercel

1. **Add New → Project**, import the `readyhire` repository. Vercel detects Next.js and uses the `vercel-build`
   script, which generates the Prisma client, runs migrations (production deployments only) and builds.
2. `vercel.json` pins functions to one region (keep it next to the database) and schedules `/api/cron/reminders`.
3. **Settings → Environment Variables** — for **Production**:

   | Variable                                       | Value                                                                                        |
   | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
   | `APP_URL`                                      | `https://readyhire.in`                                                                       |
   | `DATABASE_URL`, `DIRECT_URL`                   | from step 1                                                                                  |
   | `AUTH_SECRET`                                  | 64 random hex characters (see `.env.example`)                                                |
   | `CRON_SECRET`                                  | another random string; Vercel Cron sends it automatically                                    |
   | `STORAGE_DRIVER`, `S3_*`                       | from step 2                                                                                  |
   | `EMAIL_DRIVER`, `RESEND_API_KEY`, `EMAIL_FROM` | from step 3                                                                                  |
   | `AI_DRIVER`, `ANTHROPIC_API_KEY` (optional)    | `anthropic` and a Claude API key to turn on AI-drafted replies; leave unset to keep them off |

   For **Preview**, use the staging database, bucket and URL. Add `MIGRATE_ON_BUILD=true` if previews should migrate
   the staging database (fine for a single staging database; avoid it if several branches change the schema at once).

4. **Settings → Domains**: add your domain. HSTS and `upgrade-insecure-requests` switch on automatically once
   `APP_URL` is https.
5. Deploy. The app refuses to start with an incomplete production configuration and lists what's missing in the logs.

### AI-drafted replies (optional)

Recruiters get a **Draft with AI** button on applications waiting for a reply once `AI_DRIVER=anthropic` and
`ANTHROPIC_API_KEY` are set (create the key at [platform.claude.com](https://platform.claude.com)). Drafts use
`claude-opus-5-5` at `low` effort by default (`AI_MODEL`, `AI_EFFORT` override them), cost roughly US$0.02 each, and
every call is recorded in the `AiRequest` table (tokens and outcome, never text) so spend can be checked:

```sql
SELECT date_trunc('day', "createdAt") AS day, count(*), sum("inputTokens") AS input, sum("outputTokens") AS output
FROM "AiRequest" GROUP BY 1 ORDER BY 1 DESC;
```

Without these variables the feature stays hidden in production. Development and tests use offline template drafts.
The privacy policy already describes what is sent.

## 5. First admin

Seed data is for development only (`npm run db:seed` refuses to run when `APP_ENV=production`). Create the first
admin against the production database from your machine:

```bash
DIRECT_URL="<session pooler url>" npm run create-admin -- --email you@readyhire.in --name "Your Name"
```

A one-time password is printed; sign in and change it under **Account**. Admins can then approve recruiters and verify
candidates.

## 6. Operations

- **Health:** point an uptime monitor (Better Stack, UptimeRobot, …) at `/api/health`; it checks the database.
- **Logs:** Vercel → Logs. Email delivery problems are logged as `[email] Failed to send …` and never break user actions.
- **Reminders:** each run of `/api/cron/reminders` emails recruiters when 48 hours and 24 hours are left to reply
  and once when the deadline passes, reminds candidates and recruiters a day and two hours before each interview, and
  closes offered interview times that have all passed. It is safe to run as often as you like; schedule it every 15
  minutes so the two-hour interview reminder goes out on time. Trigger it manually with
  `curl -H "Authorization: Bearer $CRON_SECRET" https://readyhire.in/api/cron/reminders`.
- **Rollbacks:** Vercel → Deployments → Instant Rollback. Migrations are forward-only, so keep schema changes
  backward compatible with the previous release (add columns first, remove them in a later release).
- **CI:** every pull request runs lint, type checks, unit tests, a migration drift check, end-to-end tests against
  Postgres and a Docker build (`.github/workflows/ci.yml`). Protect `main` and require the CI checks to pass.

## Alternative: Docker

```bash
docker build -t readyhire .
docker build --target migrate -t readyhire-migrate .
docker run --rm -e DIRECT_URL=... readyhire-migrate          # apply migrations
docker run -p 3000:3000 --env-file .env.production readyhire # serve
```

The image runs as a non-root user and has a health check. Schedule the reminders endpoint every 15 minutes with your
platform's scheduler (or cron + curl as above).
