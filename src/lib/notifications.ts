import "server-only";
import { after } from "next/server";
import { INTERVIEW_MODE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { emails } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/transport";
import { responseDueAt } from "@/lib/jobs";

/**
 * Sends notification emails after the response is sent, so a slow or failing email provider
 * never delays or breaks the action that triggered it.
 */
function later(task: () => Promise<unknown>) {
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.error("[notify] failed:", error);
    }
  });
}

async function applicationContext(applicationId: string) {
  return db.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      candidate: { include: { user: { select: { name: true, email: true } } } },
      job: { include: { company: true, recruiter: { include: { user: { select: { name: true, email: true } } } } } },
    },
  });
}

export const notify = {
  verificationDecision(candidateId: string) {
    later(async () => {
      const c = await db.candidateProfile.findUniqueOrThrow({ where: { id: candidateId }, include: { user: true } });
      const message =
        c.verificationStatus === "VERIFIED"
          ? emails.verificationApproved(c.user.name)
          : emails.verificationRejected(c.user.name, c.rejectionReason ?? "Please review your documents.");
      await sendEmail({ to: c.user.email, ...message });
    });
  },

  recruiterDecision(recruiterId: string) {
    later(async () => {
      const r = await db.recruiterProfile.findUniqueOrThrow({ where: { id: recruiterId }, include: { user: true } });
      await sendEmail({ to: r.user.email, ...emails.recruiterDecision(r.user.name, r.approvalStatus === "APPROVED", r.reviewNote) });
    });
  },

  applicationReceived(applicationId: string) {
    later(async () => {
      const a = await applicationContext(applicationId);
      const recruiter = a.job.recruiter.user;
      await sendEmail({
        to: recruiter.email,
        ...emails.applicationReceived(recruiter.name, a.candidate.user.name, a.job.title, responseDueAt(a.createdAt), a.id),
      });
    });
  },

  applicationResponse(applicationId: string) {
    later(async () => {
      const a = await applicationContext(applicationId);
      const { name, email } = a.candidate.user;
      const message =
        a.status === "REJECTED"
          ? emails.applicationRejected(name, a.job.title, a.job.company.name, a.rejectionCategory ?? "", a.rejectionReason ?? "", a.id)
          : emails.applicationAccepted(name, a.job.title, a.job.company.name, a.responseMessage ?? "", a.id);
      await sendEmail({ to: email, ...message });
    });
  },

  interviewScheduled(interviewId: string) {
    later(async () => {
      const interview = await db.interview.findUniqueOrThrow({ where: { id: interviewId } });
      const a = await applicationContext(interview.applicationId);
      await sendEmail({
        to: a.candidate.user.email,
        ...emails.interviewScheduled(
          a.candidate.user.name,
          a.job.title,
          a.job.company.name,
          { ...interview, mode: INTERVIEW_MODE_LABEL[interview.mode] },
          a.id,
        ),
      });
    });
  },

  offerExtended(applicationId: string) {
    later(async () => {
      const a = await applicationContext(applicationId);
      await sendEmail({
        to: a.candidate.user.email,
        ...emails.offerExtended(a.candidate.user.name, a.job.title, a.job.company.name, a.offerCtcLpa, a.offerJoiningDate, a.id),
      });
    });
  },

  /** Tells the recruiter about candidate-side changes: commitment, release, withdrawal. */
  candidateUpdate(applicationId: string, change: "committed" | "released" | "withdrew", detail?: string | null) {
    later(async () => {
      const a = await applicationContext(applicationId);
      const who = a.candidate.user.name;
      const headline = {
        committed: `${who} committed to your ${a.job.title} role`,
        released: `${who} released their commitment to ${a.job.title}`,
        withdrew: `${who} withdrew from ${a.job.title}`,
      }[change];
      const recruiter = a.job.recruiter.user;
      await sendEmail({ to: recruiter.email, ...emails.candidateUpdate(recruiter.name, headline, detail ?? null, a.id) });
    });
  },
};
