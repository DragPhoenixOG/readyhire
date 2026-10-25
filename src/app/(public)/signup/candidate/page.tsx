import type { Metadata } from "next";
import Link from "next/link";
import { signupCandidate } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { TermsCheckbox } from "@/components/terms-checkbox";
import { Field, inputClass } from "@/components/ui";
import { redirectIfSignedIn } from "@/lib/auth";
import { CITIES } from "@/lib/constants";

export const metadata: Metadata = { title: "Candidate sign-up" };

export default async function CandidateSignupPage() {
  await redirectIfSignedIn();
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create your candidate account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Next, you&apos;ll upload your offer letter, notice policy and resignation evidence for verification. Hiring?{" "}
          <Link href="/signup/recruiter" className="font-medium text-brand-700 hover:underline">
            Sign up as a recruiter
          </Link>
        </p>
        <ActionForm
          action={signupCandidate}
          submitLabel="Create account"
          pendingLabel="Creating account…"
          className="mt-6"
        >
          <Field label="Full name" htmlFor="name">
            <input id="name" name="name" autoComplete="name" required className={inputClass} />
          </Field>
          <Field label="Email" htmlFor="email">
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
            <Field label="Phone" htmlFor="phone">
              <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} />
            </Field>
            <Field label="City" htmlFor="city" hint="In-person verification is available in Hyderabad and Bengaluru.">
              <select id="city" name="city" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Select a city
                </option>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <TermsCheckbox
            points={[
              "The documents I upload are genuine and I consent to Readyhire verifying them.",
              "I will keep my offers up to date and commit to only one role at a time.",
            ]}
          />
        </ActionForm>
      </div>
    </div>
  );
}
