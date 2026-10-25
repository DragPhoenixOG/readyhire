"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireApprovedRecruiter } from "@/lib/auth";
import { OPEN_APPLICATION_STATUSES, READYHIRE_ROOMS, REJECTION_CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/events";
import {
  type ActionState,
  done,
  fail,
  parseForm,
  zDate,
  zId,
  zNumber,
  zOptionalNumber,
  zOptionalText,
  zReason,
  zText,
} from "@/lib/forms";
import { parseDateTimeInput } from "@/lib/format";
import { overdueWhere } from "@/lib/jobs";
import { notify } from "@/lib/notifications";

// ───────────────────────── Jobs ─────────────────────────

const jobSchema = z
  .object({
    title: zText("Job title", 120),
    description: zText("Description", 5000),
    location: zText("Location", 120),
    workMode: z.enum(["ONSITE", "HYBRID", "REMOTE"], { error: "Choose a work mode." }),
    minExperience: zNumber("Minimum experience", 0, 40),
    maxExperience: zOptionalNumber("Maximum experience", 0, 50),
    skills: zText("Skills", 500),
    ctcMinLpa: zOptionalNumber("Minimum CTC", 0, 500),
    ctcMaxLpa: zOptionalNumber("Maximum CTC", 0, 500),
    maxJoiningDays: zOptionalNumber("Joining window", 0, 365),
    openings: zNumber("Openings", 1, 100),
  })
  .refine((v) => v.maxExperience == null || v.maxExperience >= v.minExperience, {
    message: "Maximum experience can't be lower than the minimum.",
  })
  .refine((v) => v.ctcMinLpa == null || v.ctcMaxLpa == null || v.ctcMaxLpa >= v.ctcMinLpa, {
    message: "Maximum CTC can't be lower than the minimum.",
  });

export async function postJob(_: ActionState, formData: FormData): Promise<ActionState> {
  const { recruiter } = await requireApprovedRecruiter();
  const overdue = await db.application.count({ where: { ...overdueWhere(), job: { recruiterId: recruiter.id } } });
  if (overdue > 0) {
    return fail(`You have ${overdue} overdue application response(s). Respond to them before posting a new job.`);
  }
  const parsed = parseForm(jobSchema, formData);
  if (!parsed.ok) return fail(parsed.error);

  const job = await db.job.create({
    data: { ...parsed.data, recruiterId: recruiter.id, companyId: recruiter.companyId },
  });
  redirect(`/recruiter/jobs/${job.id}`);
}

export async function setJobStatus(_: ActionState, formData: FormData): Promise<ActionState> {
  const { recruiter } = await requireApprovedRecruiter();
  const parsed = parseForm(z.object({ jobId: zId, status: z.enum(["OPEN", "CLOSED"]) }), formData);
  if (!parsed.ok) return fail(parsed.error);
  const { jobId, status } = parsed.data;

  const job = await db.job.findFirst({ where: { id: jobId, recruiterId: recruiter.id } });
  if (!job) return fail("Job not found.");
  if (status === "CLOSED") {
    const pending = await db.application.count({ where: { jobId, status: "APPLIED" } });
    if (pending > 0) return fail(`Respond to the ${pending} pending application(s) before closing this job.`);
  }
  await db.job.update({ where: { id: jobId }, data: { status } });
  refresh();
  return done(status === "CLOSED" ? "Job closed." : "Job reopened.");
}

// ───────────────────────── Applications ─────────────────────────

/** Loads an application only if it belongs to one of this recruiter's jobs. */
async function ownApplication(recruiterId: string, applicationId: string) {
  return db.application.findFirst({
    where: { id: applicationId, job: { recruiterId } },
    include: { candidate: true },
  });
}

const acceptSchema = z.object({ applicationId: zId, message: zReason("Message to the candidate") });

export async function acceptApplication(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, recruiter } = await requireApprovedRecruiter();
  const parsed = parseForm(acceptSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { applicationId, message } = parsed.data;

  const application = await ownApplication(recruiter.id, applicationId);
  if (!application) return fail("Application not found.");
  if (application.status !== "APPLIED") return fail("You've already responded to this application.");

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: application.id },
      data: { status: "ACCEPTED", respondedAt: new Date(), responseMessage: message },
    });
    await logEvent(tx, application.id, user.id, "ACCEPTED", message);
  });
  notify.applicationResponse(application.id);
  refresh();
  return done("Application accepted and the candidate has been notified.");
}

const rejectSchema = z.object({
  applicationId: zId,
  category: z.enum(REJECTION_CATEGORIES, { error: "Choose a rejection reason." }),
  reason: zReason("Explanation for the candidate"),
});

/** Rejection is allowed at any open stage, always with a reason. */
export async function rejectApplication(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, recruiter } = await requireApprovedRecruiter();
  const parsed = parseForm(rejectSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { applicationId, category, reason } = parsed.data;

  const application = await ownApplication(recruiter.id, applicationId);
  if (!application) return fail("Application not found.");
  if (!OPEN_APPLICATION_STATUSES.includes(application.status)) return fail("This application is already closed.");

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: application.id },
      data: {
        status: "REJECTED",
        respondedAt: application.respondedAt ?? new Date(),
        rejectionCategory: category,
        rejectionReason: reason,
      },
    });
    await tx.interview.updateMany({
      where: { applicationId: application.id, status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });
    // A rejected application can no longer hold the candidate's commitment.
    if (application.candidate.committedApplicationId === application.id) {
      await tx.candidateProfile.update({
        where: { id: application.candidateId },
        data: { committedApplicationId: null, committedAt: null },
      });
    }
    await logEvent(tx, application.id, user.id, "REJECTED", `${category}: ${reason}`);
  });
  notify.applicationResponse(application.id);
  refresh();
  return done("Application rejected. The candidate can see your reason.");
}

const interviewSchema = z
  .object({
    applicationId: zId,
    round: zText("Round name", 80),
    scheduledAt: z.string({ error: "Date and time are required." }),
    durationMins: zNumber("Duration", 15, 480),
    mode: z.enum(["VIDEO", "PHONE", "IN_PERSON", "READYHIRE_ROOM"], { error: "Choose an interview mode." }),
    location: zOptionalText(300),
    room: zOptionalText(100),
    notes: zOptionalText(1000),
  })
  .refine((v) => v.mode !== "READYHIRE_ROOM" || (v.room && READYHIRE_ROOMS.includes(v.room)), {
    message: "Choose a Readyhire interview room.",
  });

export async function scheduleInterview(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, recruiter } = await requireApprovedRecruiter();
  const parsed = parseForm(interviewSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { applicationId, round, durationMins, mode, location, room, notes } = parsed.data;

  const scheduledAt = parseDateTimeInput(parsed.data.scheduledAt);
  if (!scheduledAt) return fail("Enter a valid date and time.");
  if (scheduledAt < new Date()) return fail("Interviews must be scheduled in the future.");

  const application = await ownApplication(recruiter.id, applicationId);
  if (!application) return fail("Application not found.");
  if (application.status !== "ACCEPTED" && application.status !== "INTERVIEWING") {
    return fail("Accept the application before scheduling interviews.");
  }

  const place = mode === "READYHIRE_ROOM" ? `Readyhire Room — ${room}` : location;
  const interview = await db.$transaction(async (tx) => {
    const created = await tx.interview.create({
      data: { applicationId, round, scheduledAt, durationMins, mode, location: place, notes },
    });
    await tx.application.update({ where: { id: applicationId }, data: { status: "INTERVIEWING" } });
    await logEvent(tx, applicationId, user.id, "INTERVIEW_SCHEDULED", `${round} on ${parsed.data.scheduledAt.replace("T", " ")} IST`);
    return created;
  });
  notify.interviewScheduled(interview.id);
  refresh();
  return done("Interview scheduled. The candidate will be asked to confirm.");
}

const interviewUpdateSchema = z.object({
  interviewId: zId,
  status: z.enum(["COMPLETED", "NO_SHOW", "CANCELLED"], { error: "Choose an outcome." }),
});

export async function updateInterviewStatus(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, recruiter } = await requireApprovedRecruiter();
  const parsed = parseForm(interviewUpdateSchema, formData);
  if (!parsed.ok) return fail(parsed.error);

  const interview = await db.interview.findFirst({
    where: { id: parsed.data.interviewId, application: { job: { recruiterId: recruiter.id } } },
  });
  if (!interview) return fail("Interview not found.");
  if (interview.status !== "SCHEDULED") return fail("This interview has already been updated.");

  const label = { COMPLETED: "completed", NO_SHOW: "marked as a no-show", CANCELLED: "cancelled" }[parsed.data.status];
  await db.$transaction(async (tx) => {
    await tx.interview.update({ where: { id: interview.id }, data: { status: parsed.data.status } });
    await logEvent(tx, interview.applicationId, user.id, "INTERVIEW_UPDATED", `${interview.round} ${label}`);
  });
  refresh();
  return done("Interview updated.");
}

const offerSchema = z.object({
  applicationId: zId,
  offerCtcLpa: zOptionalNumber("Offer CTC", 0, 500),
  offerJoiningDate: zDate("Joining date"),
  message: zOptionalText(1000),
});

export async function extendOffer(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, recruiter } = await requireApprovedRecruiter();
  const parsed = parseForm(offerSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { applicationId, offerCtcLpa, offerJoiningDate, message } = parsed.data;

  const application = await ownApplication(recruiter.id, applicationId);
  if (!application) return fail("Application not found.");
  if (application.status !== "ACCEPTED" && application.status !== "INTERVIEWING") {
    return fail("Offers can be extended to accepted or interviewing candidates.");
  }

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: { status: "OFFERED", offerCtcLpa, offerJoiningDate },
    });
    await logEvent(tx, applicationId, user.id, "OFFERED", message);
  });
  notify.offerExtended(applicationId);
  refresh();
  return done("Offer recorded. It now counts towards the candidate's active offers.");
}

const outcomeSchema = z.object({
  applicationId: zId,
  outcome: z.enum(["JOINED", "NOT_JOINED"], { error: "Choose the joining outcome." }),
  reason: zOptionalText(1000),
});

export async function recordJoiningOutcome(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, recruiter } = await requireApprovedRecruiter();
  const parsed = parseForm(outcomeSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { applicationId, outcome, reason } = parsed.data;
  if (outcome === "NOT_JOINED" && (!reason || reason.length < 10)) {
    return fail("Explain briefly why the candidate did not join.");
  }

  const application = await ownApplication(recruiter.id, applicationId);
  if (!application) return fail("Application not found.");
  if (application.status !== "OFFERED") return fail("Joining status can be recorded once an offer is extended.");

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: { status: outcome, outcomeAt: new Date(), notJoinedReason: outcome === "NOT_JOINED" ? reason : null },
    });
    // The commitment is fulfilled (or broken) once the joining outcome is known.
    if (application.candidate.committedApplicationId === application.id) {
      await tx.candidateProfile.update({
        where: { id: application.candidateId },
        data: { committedApplicationId: null, committedAt: null },
      });
    }
    await logEvent(tx, applicationId, user.id, outcome, reason);
  });
  refresh();
  return done(outcome === "JOINED" ? "Marked as joined." : "Marked as not joined.");
}

const ghostingSchema = z.object({
  applicationId: zId,
  stage: z.enum(["INTERVIEW_NO_SHOW", "OFFER_NO_RESPONSE", "DID_NOT_JOIN", "OTHER"], { error: "Choose what happened." }),
  details: zReason("Details", 2000),
});

export async function reportGhosting(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, recruiter } = await requireApprovedRecruiter();
  const parsed = parseForm(ghostingSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { applicationId, stage, details } = parsed.data;

  const application = await ownApplication(recruiter.id, applicationId);
  if (!application) return fail("Application not found.");
  if (application.status === "APPLIED") return fail("You can report ghosting once you've engaged with the candidate.");
  const open = await db.ghostingReport.findFirst({ where: { applicationId, status: "OPEN" } });
  if (open) return fail("A ghosting report for this application is already under review.");

  await db.$transaction(async (tx) => {
    await tx.ghostingReport.create({
      data: { applicationId, candidateId: application.candidateId, reporterId: user.id, stage, details },
    });
    await logEvent(tx, applicationId, user.id, "GHOSTING_REPORTED", details);
  });
  refresh();
  return done("Report submitted. The Readyhire team will review it.");
}
