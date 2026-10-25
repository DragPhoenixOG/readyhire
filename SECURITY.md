# Security

Readyhire stores sensitive employment documents. Please report vulnerabilities privately to
**security@readyhire.in** (do not open a public issue). We aim to acknowledge reports within two business days.

## How the app protects data

- **Documents** are stored in a private bucket, uploaded directly from the browser through pre-signed URLs
  that are bound to the file's type and size, checked by content (magic bytes) before they are recorded,
  and opened only through 60-second signed links after an access check. Recruiters never receive documents.
- **Sessions** are HTTP-only, `SameSite=Lax`, signed cookies. Every request re-reads the user, so restricting
  an account, changing a password or "sign out everywhere" takes effect immediately (session versioning).
- **Passwords** are hashed with bcrypt (cost 12). Sign-in, sign-up, password reset, email verification and
  uploads are rate-limited in Postgres, so limits hold across serverless instances.
- **Email verification** is required before any dashboard is available; for recruiters it proves control of an
  address on their company's domain. Verification and reset tokens are single-use and stored only as SHA-256 hashes.
- **Headers:** a per-request nonce Content-Security-Policy, HSTS (on https), `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` and frame protection (see `src/proxy.ts`).
- **Server Actions** re-authorise every call and validate input with Zod; Next.js checks the request origin.
- **Audit log:** admin decisions and account-security events are recorded (Admin → Audit log).

## Operational checklist

- Set `AUTH_SECRET`, `CRON_SECRET` and provider keys only in the hosting dashboard, never in the repository.
- Keep the document bucket private, with "Block all public access" and default encryption on.
- Grant the app's storage key only `PutObject`, `GetObject` and `DeleteObject` on the documents prefix.
- Enable point-in-time recovery / daily backups on the database.
- Review Dependabot pull requests weekly.
