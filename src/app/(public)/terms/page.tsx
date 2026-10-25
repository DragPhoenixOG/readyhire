import type { Metadata } from "next";
import { RESPONSE_SLA_HOURS } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms & platform rules" };

const sections = [
  {
    title: "For candidates",
    rules: [
      "You will upload genuine documents: your current offer or appointment letter, your notice period policy and evidence of resignation. Readyhire may verify them by document review, screen share or an in-person / door check.",
      "Your profile is visible to recruiters only after verification. Changing verified notice details requires re-verification.",
      "You will keep the offers you hold up to date. Recruiters see how many active offers you hold.",
      "You can commit to only one role at a time. Releasing a commitment is allowed but recorded and visible to recruiters.",
      "Not attending scheduled interviews or not joining after committing can be reported by recruiters and reviewed by Readyhire.",
    ],
  },
  {
    title: "For recruiters",
    rules: [
      "You sign up with your official company email domain and are approved by Readyhire before you can post jobs or see candidates.",
      "You only post real, open positions.",
      `You respond to every application — accept with a message or reject with a reason — within ${RESPONSE_SLA_HOURS} hours. Recruiters with overdue responses can't post new jobs until they catch up.`,
      "Interviews, stage changes and joining outcomes (joined / not joined) are recorded on Readyhire.",
      "Candidate documents are reviewed only by Readyhire; recruiters see the verified summary.",
    ],
  },
  {
    title: "Enforcement",
    rules: [
      "Readyhire may flag or restrict any account that breaks these rules. Restricted accounts can't sign in.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Terms &amp; platform rules</h1>
      <p className="mt-2 text-slate-600">
        Readyhire works because both sides keep a few promises. By creating an account you agree to the rules below.
      </p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {s.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
