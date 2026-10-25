import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout, resendVerification } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { buttonClass } from "@/components/ui";
import { requireSignedIn } from "@/lib/auth";
import { homePathFor } from "@/lib/session";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage() {
  const user = await requireSignedIn();
  if (user.emailVerifiedAt) redirect(homePathFor(user.role));

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Confirm your email</h1>
        <p className="mt-2 text-sm text-slate-600">
          We sent a confirmation link to <span className="font-medium text-slate-900">{user.email}</span>. Open it to
          continue. The link expires in 24 hours.
        </p>
        {user.role === "RECRUITER" && (
          <p className="mt-2 text-sm text-slate-600">
            Confirming your work email proves you control an address on your company&apos;s domain.
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-start gap-3">
          <ActionForm
            action={resendVerification}
            submitLabel="Resend link"
            pendingLabel="Sending…"
            variant="secondary"
          />
          <form action={logout}>
            <button type="submit" className={buttonClass("ghost")}>
              Use a different account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
