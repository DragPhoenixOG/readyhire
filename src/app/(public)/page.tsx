import Link from "next/link";
import { CheckIcon } from "@/components/status";
import { buttonClass } from "@/components/ui";

const candidateSteps = [
  "Submit your current offer letter, notice period policy and resignation evidence.",
  "Readyhire verifies them — by document review, screen share or an in-person check.",
  "Your profile becomes visible to recruiters only after verification.",
  "Apply, get a guaranteed accept-or-reject (with a reason), and commit to one role at a time.",
];

const recruiterSteps = [
  "Sign up with your official company email — no ghost jobs.",
  "See only verified candidates: notice period, last working day, active offers and commitment.",
  "Schedule interviews on the platform, optionally in a controlled Readyhire interview room.",
  "Respond to every application, track stages and mark whether the candidate joined.",
];

const capabilities = [
  { title: "Verified notice period", body: "Resignation and notice-policy proof are checked before any profile is listed." },
  { title: "Offer-shopping visibility", body: "Every profile shows how many active offers the candidate currently holds." },
  { title: "Single-role commitment", body: "Candidates can commit to one role at a time; releases are tracked." },
  { title: "Company-domain recruiters", body: "Recruiters onboard with an official company domain and admin approval." },
  { title: "Mandatory responses", body: "Recruiters accept or reject every application with a reason, within 72 hours." },
  { title: "Joining outcomes", body: "Interviews, offers and joined / not-joined status are tracked end to end." },
];

export default function LandingPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-brand-50/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-800">
            <CheckIcon /> Built for GCCs in Hyderabad &amp; Bengaluru and quick hirers
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Verified candidates. Predictable joining.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Readyhire lists only candidates whose notice period, resignation and current offers have been verified — so
            you know when someone can actually join, how many offers they hold, and whether they&apos;ll show up.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup/recruiter" className={buttonClass("primary")}>
              I&apos;m hiring
            </Link>
            <Link href="/signup/candidate" className={buttonClass("secondary")}>
              I&apos;m a candidate serving notice
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-2">
        <StepCard title="For candidates" steps={candidateSteps} />
        <StepCard title="For recruiters" steps={recruiterSteps} />
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">What makes a Readyhire listing trustworthy</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c) => (
              <div key={c.title} className="rounded-xl border border-slate-200 p-5">
                <p className="flex items-center gap-2 font-medium text-slate-900">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-brand-800">
                    <CheckIcon />
                  </span>
                  {c.title}
                </p>
                <p className="mt-2 text-sm text-slate-600">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function StepCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm text-slate-700">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-semibold text-white">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
