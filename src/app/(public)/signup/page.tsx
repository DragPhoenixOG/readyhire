import type { Metadata } from "next";
import Link from "next/link";
import { redirectIfSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupChooserPage() {
  await redirectIfSignedIn();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Join Readyhire</h1>
      <p className="mt-1 text-sm text-slate-600">Choose how you&apos;ll use the platform.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ChooserCard
          href="/signup/candidate"
          title="I'm a candidate"
          body="You've resigned or are serving notice. Get verified once, then apply to roles that need someone who can join soon."
          cta="Sign up as a candidate"
        />
        <ChooserCard
          href="/signup/recruiter"
          title="I'm hiring"
          body="You recruit for a GCC or a fast-moving team. Sign up with your company email to see verified candidates."
          cta="Sign up as a recruiter"
        />
      </div>
    </div>
  );
}

function ChooserCard({ href, title, body, cta }: { href: string; title: string; body: string; cta: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
      <p className="mt-4 text-sm font-medium text-brand-700 group-hover:underline">{cta} →</p>
    </Link>
  );
}
