import type { Metadata } from "next";
import Link from "next/link";
import { resetPassword } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Field, buttonClass, inputClass } from "@/components/ui";
import { peekAuthToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token: raw } = await searchParams;
  const token = typeof raw === "string" ? raw : "";
  const valid = await peekAuthToken(token, "PASSWORD_RESET");

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        {valid ? (
          <ActionForm action={resetPassword} submitLabel="Save password" pendingLabel="Saving…" className="mt-6">
            <input type="hidden" name="token" value={token} />
            <Field
              label="New password"
              htmlFor="password"
              hint="At least 8 characters. You'll be signed out on other devices."
            >
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
            <Field label="Repeat new password" htmlFor="confirm">
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className={inputClass}
              />
            </Field>
          </ActionForm>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">This reset link has expired or was already used.</p>
            <Link href="/forgot-password" className={`${buttonClass("primary")} mt-6`}>
              Request a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
