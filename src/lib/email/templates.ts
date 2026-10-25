import "server-only";
import { env } from "@/lib/env";
import { formatDate, formatDateTime, formatLpa } from "@/lib/format";
import type { EmailMessage } from "@/lib/email/transport";

type Template = Omit<EmailMessage, "to">;

function escape(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function absoluteUrl(path: string) {
  return new URL(path, env.APP_URL).toString();
}

type Block = { text: string } | { quote: string } | { button: { label: string; path: string } } | { muted: string };

/** Builds a plain-text and a simple, email-client-safe HTML version from the same content. */
function render(subject: string, greeting: string, blocks: Block[]): Template {
  const text = [
    greeting,
    "",
    ...blocks.map((b) =>
      "text" in b ? b.text : "quote" in b ? `> ${b.quote}` : "button" in b ? `${b.button.label}: ${absoluteUrl(b.button.path)}` : b.muted,
    ),
    "",
    "— Readyhire · Hire with confirmed availability",
  ].join("\n\n");

  const body = blocks
    .map((b) => {
      if ("text" in b) return `<p style="margin:0 0 16px;line-height:1.55">${escape(b.text)}</p>`;
      if ("quote" in b)
        return `<p style="margin:0 0 16px;padding:12px 16px;background:#f1f5f9;border-left:3px solid #186357;border-radius:6px;line-height:1.55;white-space:pre-line">${escape(b.quote)}</p>`;
      if ("button" in b)
        return `<p style="margin:24px 0"><a href="${escape(absoluteUrl(b.button.path))}" style="background:#186357;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;display:inline-block">${escape(b.button.label)}</a></p>`;
      return `<p style="margin:0 0 16px;color:#64748b;font-size:13px;line-height:1.5">${escape(b.muted)}</p>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="padding:20px 28px;border-bottom:1px solid #f1f5f9;font-weight:700;font-size:18px;color:#186357">✓ Readyhire</td></tr>
<tr><td style="padding:24px 28px;font-size:15px"><p style="margin:0 0 16px">${escape(greeting)}</p>${body}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:12px">Readyhire · Hire with confirmed availability</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}

const hi = (name: string) => `Hi ${name.split(" ")[0]},`;

export const emails = {
  verifyEmail: (name: string, token: string) =>
    render("Confirm your email for Readyhire", hi(name), [
      { text: "Confirm your email address to start using Readyhire. The link expires in 24 hours." },
      { button: { label: "Confirm email", path: `/verify-email/confirm?token=${encodeURIComponent(token)}` } },
      { muted: "If you didn't create a Readyhire account, you can ignore this email." },
    ]),

  passwordReset: (name: string, token: string) =>
    render("Reset your Readyhire password", hi(name), [
      { text: "Someone asked to reset the password for your Readyhire account. The link expires in 1 hour." },
      { button: { label: "Choose a new password", path: `/reset-password?token=${encodeURIComponent(token)}` } },
      { muted: "If this wasn't you, ignore this email — your password stays the same." },
    ]),

  verificationApproved: (name: string) =>
    render("You're verified on Readyhire", hi(name), [
      { text: "Your notice period, resignation and offer letter have been verified. Recruiters can now see your profile and you can apply to jobs." },
      { button: { label: "Browse jobs", path: "/candidate/jobs" } },
    ]),

  verificationRejected: (name: string, reason: string) =>
    render("Your Readyhire verification needs changes", hi(name), [
      { text: "We couldn't verify your documents yet. Here's what to fix:" },
      { quote: reason },
      { button: { label: "Update and resubmit", path: "/candidate/verification" } },
    ]),

  recruiterDecision: (name: string, approved: boolean, note: string | null) =>
    approved
      ? render("Your Readyhire recruiter account is approved", hi(name), [
          { text: "You can now post jobs and see verified candidates." },
          { button: { label: "Open your dashboard", path: "/recruiter" } },
        ])
      : render("Your Readyhire recruiter account wasn't approved", hi(name), [
          { text: "We couldn't approve your recruiter account." },
          ...(note ? [{ quote: note }] : []),
          { muted: "Reply to this email if you think this is a mistake." },
        ]),

  applicationReceived: (recruiterName: string, candidateName: string, jobTitle: string, dueAt: Date, applicationId: string) =>
    render(`New application: ${candidateName} for ${jobTitle}`, hi(recruiterName), [
      { text: `${candidateName} (verified notice period) applied for ${jobTitle}.` },
      { text: `Accept with a message or reject with a reason by ${formatDateTime(dueAt)}.` },
      { button: { label: "Review application", path: `/recruiter/applications/${applicationId}` } },
    ]),

  applicationAccepted: (name: string, jobTitle: string, company: string, message: string, applicationId: string) =>
    render(`${company} accepted your application`, hi(name), [
      { text: `Good news — ${company} accepted your application for ${jobTitle}.` },
      { quote: message },
      { button: { label: "View application", path: `/candidate/applications/${applicationId}` } },
    ]),

  applicationRejected: (name: string, jobTitle: string, company: string, category: string, reason: string, applicationId: string) =>
    render(`Update on your ${jobTitle} application`, hi(name), [
      { text: `${company} isn't moving forward with your application for ${jobTitle}. Their reason:` },
      { quote: `${category}\n${reason}` },
      { button: { label: "View application", path: `/candidate/applications/${applicationId}` } },
    ]),

  interviewScheduled: (
    name: string,
    jobTitle: string,
    company: string,
    interview: { round: string; scheduledAt: Date; mode: string; location: string | null },
    applicationId: string,
  ) =>
    render(`Interview scheduled: ${interview.round} with ${company}`, hi(name), [
      { text: `${company} scheduled "${interview.round}" for ${jobTitle}.` },
      { quote: [formatDateTime(interview.scheduledAt), interview.mode, interview.location].filter(Boolean).join("\n") },
      { text: "Please confirm that you'll attend." },
      { button: { label: "Confirm attendance", path: `/candidate/applications/${applicationId}` } },
    ]),

  offerExtended: (name: string, jobTitle: string, company: string, ctc: number | null, joining: Date | null, applicationId: string) =>
    render(`Offer from ${company}`, hi(name), [
      { text: `${company} extended an offer for ${jobTitle}${ctc ? ` at ${formatLpa(ctc)}` : ""}, joining ${formatDate(joining)}.` },
      { text: "If you intend to join, commit to the role on Readyhire so the team can plan for you." },
      { button: { label: "View offer", path: `/candidate/applications/${applicationId}` } },
    ]),

  candidateUpdate: (recruiterName: string, headline: string, detail: string | null, applicationId: string) =>
    render(headline, hi(recruiterName), [
      { text: headline + "." },
      ...(detail ? [{ quote: detail }] : []),
      { button: { label: "View application", path: `/recruiter/applications/${applicationId}` } },
    ]),

  responseReminder: (recruiterName: string, dueSoon: string[], overdue: string[]) =>
    render(
      overdue.length ? `${overdue.length} application(s) overdue for a response` : `${dueSoon.length} application(s) due for a response`,
      hi(recruiterName),
      [
        ...(overdue.length
          ? [
              { text: "These applications are past the 72-hour response deadline. Posting new jobs is paused until you reply:" },
              { quote: overdue.join("\n") },
            ]
          : []),
        ...(dueSoon.length
          ? [{ text: "These applications are due for a response within 24 hours:" }, { quote: dueSoon.join("\n") }]
          : []),
        { button: { label: "Respond now", path: "/recruiter/applications?tab=response" } },
      ],
    ),
};
