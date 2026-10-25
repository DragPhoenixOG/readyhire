import type { Metadata } from "next";
import Link from "next/link";
import { login } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { redirectIfSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

const DEMO_PASSWORD = "Readyhire@123";
const demoAccounts = [
  { role: "Admin", email: "admin@readyhire.in" },
  { role: "Recruiter (approved)", email: "priya.menon@northwind.com" },
  { role: "Recruiter (approved)", email: "arjun.rao@contoso.com" },
  { role: "Recruiter (pending)", email: "kavya.iyer@fabrikam.io" },
  { role: "Candidate (verified)", email: "ananya.sharma@example.com" },
  { role: "Candidate (pending review)", email: "rohan.verma@example.com" },
  { role: "Candidate (new)", email: "neha.gupta@example.com" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await redirectIfSignedIn();
  const { next } = await searchParams;
  const showDemo = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_ACCOUNTS === "true";

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_minmax(0,22rem)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to Readyhire</h1>
        <p className="mt-1 text-sm text-slate-600">
          New here?{" "}
          <Link href="/signup" className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
        <ActionForm action={login} submitLabel="Sign in" pendingLabel="Signing in…" className="mt-6">
          <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
          </Field>
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </Field>
        </ActionForm>
      </div>

      {showDemo && (
        <aside className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm">
          <p className="font-semibold text-slate-900">Demo accounts</p>
          <p className="mt-1 text-slate-600">
            Seeded by <code className="rounded bg-slate-100 px-1">npm run db:seed</code>. Password for all:{" "}
            <code className="rounded bg-slate-100 px-1">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-3 divide-y divide-slate-100">
            {demoAccounts.map((a) => (
              <li key={a.email} className="py-2">
                <p className="text-xs text-slate-500">{a.role}</p>
                <p className="font-mono text-xs text-slate-800">{a.email}</p>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
