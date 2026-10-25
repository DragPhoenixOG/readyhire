import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-600">We&apos;ll email you a link to choose a new password.</p>
        <ActionForm action={requestPasswordReset} submitLabel="Email me a reset link" pendingLabel="Sending…" className="mt-6">
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
          </Field>
        </ActionForm>
        <p className="mt-6 text-sm text-slate-600">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
