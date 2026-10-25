import type { Metadata } from "next";
import { confirmEmail } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";

export const metadata: Metadata = { title: "Confirm your email" };

// The link only opens this page; confirming takes a click, so mail scanners that
// prefetch links can't use up the token.
export default async function ConfirmEmailPage({ searchParams }: PageProps<"/verify-email/confirm">) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Confirm your email</h1>
        <p className="mt-2 text-sm text-slate-600">One more click and you&apos;re in.</p>
        <ActionForm action={confirmEmail} submitLabel="Confirm email" pendingLabel="Confirming…" className="mt-6">
          <input type="hidden" name="token" value={typeof token === "string" ? token : ""} />
        </ActionForm>
      </div>
    </div>
  );
}
