# Readyhire

**Verified candidates. Predictable joining. Built for GCCs and quick hirers.**

Readyhire lists only candidates whose notice period, resignation and current offer letter have been verified.
Recruiters see when a candidate can actually join, how many active offers they hold and whether they've committed to a
role. Every application gets an accept or a reject with a reason, and the platform tracks each hire from application
to joining.

Three modules: **Candidate**, **Recruiter** and **Admin**.

- **Candidates** upload their offer letter, notice policy and resignation evidence, get verified, apply to jobs,
  declare competing offers, commit to one role at a time and confirm interviews.
- **Recruiters** sign up with a company email domain, are approved by an admin, post jobs, see verified talent with
  notice and offer signals, must accept or reject every application with a reason within 72 hours, schedule
  interviews (optionally in a Readyhire room), extend offers, record joining outcomes and report ghosting.
- **Admins** review documents, verify candidates (document review, screen share or in-person), approve recruiters,
  resolve ghosting reports, flag or restrict users, and track response rates and joining outcomes. Every decision is
  in the audit log.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL with Prisma 7 ·
S3-compatible document storage · Resend or SMTP email · Zod · Vitest and Playwright · GitHub Actions.

The production setup (Vercel + Supabase + AWS S3, all in Mumbai, + Resend) is described step by step in
**[docs/deployment.md](docs/deployment.md)**. Security design: **[SECURITY.md](SECURITY.md)**.

## Local development

Requires Node.js 22 (see `.nvmrc`) and Docker for Postgres (or any PostgreSQL 15+).

```bash
cp .env.example .env
docker compose up -d      # PostgreSQL on localhost:5432
npm install
npm run setup             # apply migrations, generate the Prisma client, load demo data
npm run dev               # http://localhost:3000
```

In development, documents are stored in `./storage` and emails are printed to the terminal (look for `[email]`), so
nothing external is needed. Email confirmation and password-reset links appear there too.

### Demo accounts

Every seeded account uses the password **`Readyhire@123`**. The sign-in page lists them in development.

| Role                                  | Email                       |
| ------------------------------------- | --------------------------- |
| Admin                                 | `admin@readyhire.in`        |
| Recruiter, approved (Northwind GCC)   | `priya.menon@northwind.com` |
| Recruiter, approved, overdue replies  | `arjun.rao@contoso.com`     |
| Recruiter, awaiting approval          | `kavya.iyer@fabrikam.io`    |
| Candidate, verified and committed     | `ananya.sharma@example.com` |
| Candidate, offer extended             | `vikram.singh@example.com`  |
| Candidate, verification pending       | `rohan.verma@example.com`   |
| Candidate, changes requested          | `divya.menon@example.com`   |
| Candidate, brand new                  | `neha.gupta@example.com`    |
| Candidate, restricted (can't sign in) | `sameer.khan@example.com`   |

Seed dates are relative to when you run the seed, so there are always upcoming interviews, fresh applications and one
overdue reply. `npm run db:seed` resets everything (it refuses to run against production).

### A five-minute walkthrough

1. **Candidate** (Neha): fill in the profile and notice details, upload the three documents, submit for verification.
2. **Admin**: Verifications → Neha → preview and verify each document → approve with a verification method.
3. **Candidate**: apply to a job; the application shows when the recruiter's reply is due.
4. **Recruiter** (Priya): Applications → accept with a message or reject with a reason → schedule an interview →
   extend an offer → record whether the candidate joined.
5. **Candidate**: commit to the accepted role; applying elsewhere is blocked until the commitment is released.
6. **Recruiter** (Arjun): an overdue reply pauses job posting until he responds.

## Core rules and where they're enforced

| Rule                                   | Enforcement                                                                                                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Only verified candidates are listed    | `approveCandidate` (`src/actions/admin.ts`) requires all three documents verified; the talent pool and `applyToJob` admit only verified candidates (`src/lib/candidate.ts`).                                                                              |
| Verified details can't change silently | Notice details, documents and current company lock while verification is pending or done; changing them means reopening verification, which hides the profile.                                                                                            |
| Recruiters use a company domain        | Personal and disposable mailboxes are blocked, the domain must match the company website (`src/lib/domain.ts`), the inbox must be confirmed, and an admin approves the account.                                                                           |
| Every application gets a response      | Accepting needs a message; rejecting needs a category plus a 15+ character explanation. Replies are due in 72 hours, reminders go out 24 hours before, and overdue recruiters can't post jobs (`src/actions/recruiter.ts`, `src/app/api/cron/reminders`). |
| One commitment at a time               | A single unique `committedApplicationId` per candidate, set with a conditional update; committed candidates can't apply elsewhere; releases are logged and shown to recruiters.                                                                           |
| Offer-shopping visibility              | Active offers = declared offers still held or accepted + offers extended on Readyhire, with how many are backed by verified proof (`summarizeCandidate`).                                                                                                 |
| Joining is tracked                     | Offered applications end as Joined or Did not join; recruiters can report ghosting; upheld reports appear on the candidate's profile.                                                                                                                     |
| Documents stay private                 | Direct-to-bucket uploads with pre-signed URLs, content (magic-byte) checks, and 60-second signed download links for the owner and admins only (`src/actions/documents.ts`, `src/lib/storage`).                                                            |

### Status flows

```
Verification:  NOT_SUBMITTED → PENDING → VERIFIED
                                 ↘ REJECTED → (fix & resubmit) → PENDING
               VERIFIED → (candidate reopens) → NOT_SUBMITTED

Application:   APPLIED ─┬→ ACCEPTED → INTERVIEWING → OFFERED ─┬→ JOINED
                        │                                     └→ NOT_JOINED
                        └→ REJECTED   (recruiter may reject at any open stage, with a reason)
               Any open stage → WITHDRAWN (candidate, with a reason)
```

## Project layout

```
├── prisma/                 # schema, migrations, demo seed
├── scripts/                # create-admin, Vercel build (with migrations), script helpers
├── src/
│   ├── actions/            # Server Actions: auth, candidate, documents, recruiter, admin
│   ├── app/
│   │   ├── (public)/       # landing, sign-in/up, email verification, password reset, terms, privacy
│   │   ├── candidate/      # dashboard, verification, jobs, applications, offers, profile, account
│   │   ├── recruiter/      # dashboard, applications, jobs, verified talent, account
│   │   ├── admin/          # dashboard, verifications, recruiters, applications, reports, users, audit log
│   │   └── api/            # health, cron reminders, document links, local storage stand-in
│   ├── components/         # UI primitives, forms, uploader, trust-signal panels
│   ├── lib/                # env, auth/session, db, storage, email, rate limiting, rules and formatting
│   └── proxy.ts            # route protection + security headers (Next.js 16 "proxy", formerly middleware)
├── e2e/                    # Playwright end-to-end tests
├── docs/deployment.md      # production setup
├── Dockerfile              # image for non-Vercel hosts
└── vercel.json             # Mumbai region + hourly reminder cron
```

## Scripts

| Command                                                 | What it does                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                                           | Dev server on port 3000                                        |
| `npm run setup`                                         | Apply migrations, generate the Prisma client, load demo data   |
| `npm run db:migrate -- --name <change>`                 | Create and apply a migration after editing the schema          |
| `npm run db:seed` · `npm run db:reset`                  | Reset demo data · drop, re-migrate and re-seed (never in prod) |
| `npm run db:deploy`                                     | Apply pending migrations (production)                          |
| `npm run create-admin -- --email … --name …`            | Create an admin account (any environment)                      |
| `npm run lint` · `npm run typecheck` · `npm run format` | Code quality                                                   |
| `npm test`                                              | Unit tests (Vitest)                                            |
| `npm run test:e2e`                                      | End-to-end tests (Playwright) against a production build       |
| `npm run build` · `npm start`                           | Production build and server                                    |

## Tests

```bash
npm test                          # unit tests for the business rules
npx playwright install chromium   # first time only
npm run test:e2e
```

The end-to-end suite builds the app and runs it against its own database (`readyhire_e2e` on the local Postgres,
created automatically; override with `E2E_DATABASE_URL`), local storage and a file-based email outbox, so it can follow
confirmation and reset links. It covers the company-domain check, email verification, password reset, verification
gating, upload content checks, the mandatory reply with a reason, single-role commitment, overdue reminders, document
access control and the security headers.

CI (`.github/workflows/ci.yml`) runs formatting, lint, type checks, unit tests and the build; a migration drift check
and the end-to-end suite against Postgres; and a Docker image build.

--Team ReadyHire
