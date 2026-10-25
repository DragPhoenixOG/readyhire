import type { Metadata } from "next";
import Link from "next/link";
import { signupRecruiter } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { TermsCheckbox } from "@/components/terms-checkbox";
import { Field, inputClass } from "@/components/ui";
import { redirectIfSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Recruiter sign-up" };

export default async function RecruiterSignupPage() {
  await redirectIfSignedIn();
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create your recruiter account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use your official company email. Personal mailboxes (Gmail, Outlook, Yahoo…) are not accepted, and every
          recruiter account is approved by the Readyhire team. Looking for a job?{" "}
          <Link href="/signup/candidate" className="font-medium text-brand-700 hover:underline">
            Sign up as a candidate
          </Link>
        </p>
        <ActionForm action={signupRecruiter} submitLabel="Create account" pendingLabel="Creating account…" className="mt-6">
          <Field label="Full name" htmlFor="name">
            <input id="name" name="name" autoComplete="name" required className={inputClass} />
          </Field>
          <Field label="Work email" htmlFor="email" hint="Must be on your company's domain, e.g. you@northwind.com.">
            <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="companyName">
              <input id="companyName" name="companyName" autoComplete="organization" required className={inputClass} />
            </Field>
            <Field label="Company website" htmlFor="website" hint="Optional. Checked against your email domain.">
              <input id="website" name="website" placeholder="northwind.com" className={inputClass} />
            </Field>
            <Field label="Your title" htmlFor="title">
              <input id="title" name="title" placeholder="Talent Acquisition Lead" className={inputClass} />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} />
            </Field>
          </div>
          <TermsCheckbox
            points={[
              "I am hiring for a real, open position at my company.",
              "I will accept or reject every application with a reason, and record joining outcomes.",
            ]}
          />
        </ActionForm>
      </div>
    </div>
  );
}
