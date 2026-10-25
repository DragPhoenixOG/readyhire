import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

const sections = [
  {
    title: "What we collect",
    body: [
      "Account details: name, email, phone, city and a hashed password.",
      "For candidates: your current employer, notice period, resignation and last working dates, the verification documents you upload (offer or appointment letter, notice policy, resignation evidence), offers you declare and your applications.",
      "For recruiters: your company, work email and the jobs, interviews and decisions you record.",
    ],
  },
  {
    title: "Why we use it",
    body: [
      "To verify notice periods and resignations before a profile is listed, to run applications and interviews, and to show recruiters a verified summary.",
      "To send service emails: account confirmation, password resets, application updates and response reminders.",
    ],
  },
  {
    title: "Who can see what",
    body: [
      "Your verification documents are visible only to you and to Readyhire's verification team. Recruiters never receive the documents.",
      "Recruiters see your verified notice summary, the number of active offers you hold, your commitment status and your profile. Contact details are shared only after a recruiter accepts your application.",
      "We don't sell personal data.",
    ],
  },
  {
    title: "Where it's stored",
    body: [
      "Data and documents are stored with our cloud providers in India (Mumbai region) and encrypted at rest. Documents are opened only through short-lived, access-checked links.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can update your profile and offers at any time, and reopen verification to change verified details.",
      "Under India's Digital Personal Data Protection Act, 2023 you can ask to access, correct or erase your data. Write to privacy@readyhire.in and we'll respond within 30 days.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-2 text-slate-600">
        Readyhire handles sensitive employment documents. Here&apos;s what we collect, why, and who can see it.
      </p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {s.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
