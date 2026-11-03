import "server-only";
import { INTERVIEW_MODE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { emails } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/transport";
import { interviewReminderStage } from "@/lib/interviews";

const HOUR = 60 * 60 * 1000;

/**
 * Reminds the candidate and the recruiter about interviews a day ahead and two hours ahead. Safe to run as often as
 * every few minutes: each reminder is recorded once both emails have gone out.
 */
export async function sendInterviewReminders(now = new Date()) {
  const upcoming = await db.interview.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { gt: now, lte: new Date(now.getTime() + 24 * HOUR) },
      OR: [{ reminder24hSentAt: null }, { reminder2hSentAt: null }],
      application: {
        status: { in: ["ACCEPTED", "INTERVIEWING", "OFFERED"] },
        candidate: { user: { status: "ACTIVE" } },
      },
    },
    include: {
      application: {
        select: {
          id: true,
          candidate: { select: { user: { select: { name: true, email: true } } } },
          job: {
            select: {
              title: true,
              company: { select: { name: true } },
              recruiter: { select: { user: { select: { name: true, email: true, status: true } } } },
            },
          },
        },
      },
    },
  });

  let sent = 0;
  for (const interview of upcoming) {
    const stage = interviewReminderStage(interview, now);
    if (!stage) continue;
    const { candidate, job } = interview.application;
    const details = { ...interview, mode: INTERVIEW_MODE_LABEL[interview.mode] };
    const when = stage === "2h" ? "soon" : "tomorrow";
    const toCandidate = await sendEmail({
      to: candidate.user.email,
      ...emails.interviewReminder(
        candidate.user.name,
        when,
        details,
        job.title,
        job.company.name,
        `/candidate/applications/${interview.application.id}`,
      ),
    });
    const recruiter = job.recruiter.user;
    const toRecruiter =
      recruiter.status !== "ACTIVE" ||
      (await sendEmail({
        to: recruiter.email,
        ...emails.interviewReminder(
          recruiter.name,
          when,
          details,
          job.title,
          job.company.name,
          `/recruiter/applications/${interview.application.id}`,
        ),
      }));
    // Retry next run if an email failed; a 2-hour reminder also settles the day-ahead one.
    if (!toCandidate || !toRecruiter) continue;
    await db.interview.update({
      where: { id: interview.id },
      data:
        stage === "2h"
          ? { reminder2hSentAt: now, reminder24hSentAt: interview.reminder24hSentAt ?? now }
          : { reminder24hSentAt: now },
    });
    sent += 1;
  }
  return sent;
}

/** Open invites whose offered times have all passed can no longer be booked. */
export async function expireInterviewInvites(now = new Date()) {
  const { count } = await db.interviewInvite.updateMany({
    where: { status: "OPEN", slots: { none: { startsAt: { gt: now } } } },
    data: { status: "EXPIRED" },
  });
  return count;
}
