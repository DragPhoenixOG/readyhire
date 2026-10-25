# Readyhire

**Verified candidates. Predictable joining. Built for GCCs and quick hirers.**

Readyhire lists only candidates whose notice period, resignation and current offer letter have been verified. Recruiters
see when a candidate can actually join, how many active offers they hold and whether they have committed to a role.
Every application gets an accept or a reject with a reason, and the platform tracks each hire from application to
joining.

This folder is a self-contained MVP with three role-based modules: **Admin**, **Recruiter** and **Candidate**.

## Quick start

Requires Node.js 20.19+, 22.12+ or 24+ (Prisma 7's minimum).

```bash
cd readyhire
cp .env.example .env      # optional: the defaults work for local development
npm install
npm run setup             # creates the SQLite database and loads demo data
npm run dev
```

Open <http://localhost:3000>. The sign-in page lists the demo accounts.

### Demo accounts

Every seeded account uses the password **`Readyhire@123`**.

| Role                                 | Email                       |
| ------------------------------------ | --------------------------- |
| Admin                                | `admin@readyhire.in`        |
| Recruiter, approved (Northwind GCC)  | `priya.menon@northwind.com` |
| Recruiter, approved, overdue replies | `arjun.rao@contoso.com`     |
| Recruiter, awaiting approval         | `kavya.iyer@fabrikam.io`    |
| Candidate, verified and committed    | `ananya.sharma@example.com` |
| Candidate, offer extended            | `vikram.singh@example.com`  |
| Candidate, verification pending      | `rohan.verma@example.com`   |
| Candidate, changes requested         | `divya.menon@example.com`   |
| Candidate, brand new                 | `neha.gupta@example.com`    |
| Candidate, restricted (can't sign in)| `sameer.khan@example.com`   |

Seed dates are relative to when you run the seed, so there are always upcoming interviews, fresh applications and
one overdue reply. Run `npm run db:seed` at any time to reset the demo data.

### A five-minute walkthrough

1. **Candidate:** sign in as Neha. Fill in your profile and notice details, upload the three documents (any PDF or
   image), then submit them for verification. Jobs show "Verification required" until you're verified.
2. **Admin:** open **Verifications → Neha Gupta**. Preview and verify each document, then approve with a verification
   method (document review, screen share or in-person check) and internal notes.
3. **Candidate:** apply to a job. The application page shows when the recruiter's reply is due.
4. **Recruiter:** sign in as Priya and open **Applications**. Accept with a message or reject with a reason, schedule
   an interview (optionally in a Readyhire room), extend an offer and record whether the candidate joined.
5. **Candidate:** commit to the accepted role. Applying elsewhere is blocked until you release the commitment.
6. **Recruiter:** sign in as Arjun. An overdue reply pauses job posting until he responds.

## Core rules and where they're enforced

| Rule | Enforcement |
| ---- | ----------- |
| Candidates are listed only after their offer letter, notice policy and resignation evidence are verified | `approveCandidate` requires all three documents to be verified, and the verified-talent list and job applications are limited to verified candidates (`src/actions/admin.ts`, `src/lib/candidate.ts`, `applyToJob`) |
| Verified details can't be changed silently | Notice details, documents and current company lock while verification is pending or done. Changing them means reopening verification, which hides the profile from recruiters. |
| Recruiters sign up with a company domain | Personal and disposable mailboxes are blocked, and the email domain must match the company website (`src/lib/domain.ts`). Admins also approve each recruiter. |
| Recruiters respond to every application | Accepting needs a message and rejecting needs a category plus an explanation of at least 15 characters. Replies are due within 72 hours. While any reply is overdue the recruiter can't post jobs, and a job can't be closed while applications are still waiting (`src/actions/recruiter.ts`). |
| One commitment at a time | The candidate profile holds a single, unique `committedApplicationId`, set with a conditional update. Committed candidates can't apply elsewhere, and every release is logged and shown to recruiters. |
| Offer-shopping visibility | Active offers = offers the candidate declared as holding or accepted + offers extended through Readyhire, with a count of declared offers whose proof has been verified (`summarizeCandidate`) |
| Joining is tracked | An offered application ends as **Joined** or **Did not join**, which also clears the commitment. Recruiters can report ghosting; admins uphold or dismiss reports, and upheld reports appear on the candidate's profile. |
| Documents stay private | Uploads are checked by file content (PDF, PNG, JPG, WebP, up to 5 MB), stored outside `public/`, and served only to their owner and to admins (`src/app/api/documents/[id]/route.ts`) |

### Status flows

```
Verification:  NOT_SUBMITTED → PENDING → VERIFIED
                                 ↘ REJECTED → (fix & resubmit) → PENDING
               VERIFIED → (candidate reopens) → NOT_SUBMITTED

Application:   APPLIED ─┬→ ACCEPTED → INTERVIEWING → OFFERED ─┬→ JOINED
                        │                                     └→ NOT_JOINED
                        └→ REJECTED   (recruiter may also reject at any open stage, with a reason)
               Any open stage → WITHDRAWN (candidate, with a reason)
```

## Project layout

```
readyhire/
├── prisma/
│   ├── schema.prisma        # data model
│   ├── migrations/
│   └── seed.ts              # demo data (wipes and recreates everything)
├── src/
│   ├── actions/             # Server Actions per role: auth, candidate, recruiter, admin
│   ├── app/
│   │   ├── (public)/        # landing, login, sign-up, terms
│   │   ├── candidate/       # candidate dashboard, verification, jobs, applications, offers, profile
│   │   ├── recruiter/       # recruiter dashboard, applications, jobs, verified talent
│   │   ├── admin/           # admin dashboard, verifications, recruiters, applications, reports, users
│   │   └── api/documents/   # authenticated document downloads
│   ├── components/          # UI primitives, status badges, candidate signals, forms
│   ├── lib/                 # auth/session, db client, uploads, validation, domain rules
│   └── proxy.ts             # role-based route protection (Next.js 16 "proxy", formerly middleware)
└── e2e/                     # Playwright tests for the core flows
```

The stack is Next.js 16 (App Router, Server Actions), React 19, Prisma 7 with SQLite (via `better-sqlite3`),
Tailwind CSS 4 and Zod. Authentication is email and password: bcrypt hashes and a signed, HTTP-only JWT cookie
(`jose`). Every page and Server Action re-reads the user from the database, so restricting a user takes effect
immediately.

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run setup` | Apply migrations, generate the Prisma client and seed demo data |
| `npm run db:seed` | Reset the database to the demo data |
| `npm run db:migrate` | Create and apply a migration after changing `schema.prisma` |
| `npm run db:reset` | Drop the database, re-apply migrations and re-seed |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript checks |
| `npm run test:e2e` | Playwright end-to-end tests (see below) |

## End-to-end tests

```bash
npx playwright install chromium   # first time only
npm run test:e2e
```

The tests start their own dev server on port 3200 with a separate database (`prisma/e2e.db`) and upload folder, and
re-seed them on each run, so your development data is untouched. Stop `npm run dev` first, because Next.js allows only
one dev server per project folder. The tests cover the company-domain check, verification gating, the mandatory reply
with a reason, single-role commitment, pausing job posts for overdue replies, and document access control.

## Configuration

See `.env.example`. In production, set `AUTH_SECRET` and serve the app over HTTPS: session cookies are marked
`Secure` when `NODE_ENV=production`.

## Not in this MVP

- Email or WhatsApp notifications (responses, interview reminders, overdue reminders)
- Scheduling for field teams' in-person checks and Readyhire rooms (rooms are a fixed list today)
- Structured screen-share evidence (today it's the admin's internal notes)
- Object storage for documents and a hosted database (SQLite and local disk are fine for a pilot)
