"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCandidate } from "@/lib/auth";
import { verificationEditable } from "@/lib/candidate";
import {
  CITIES,
  COMMITTABLE_STATUSES,
  DOCUMENT_INFO,
  OPEN_APPLICATION_STATUSES,
  REQUIRED_DOCUMENTS,
} from "@/lib/constants";
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
  zOptionalDate,
  zOptionalNumber,
  zOptionalText,
  zReason,
  zText,
} from "@/lib/forms";
import { formatDateTime } from "@/lib/format";
import { notify } from "@/lib/notifications";

// ───────────────────────── Profile ─────────────────────────

const profileSchema = z.object({
  headline: zOptionalText(120),
  currentCompany: zOptionalText(120),
  currentTitle: zOptionalText(120),
  experienceYears: zOptionalNumber("Experience", 0, 50),
  skills: zOptionalText(500),
  city: z.enum(CITIES, { error: "Choose your city." }),
  phone: zOptionalText(20),
});

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const { profile } = await requireCandidate();
  const parsed = parseForm(profileSchema, formData);
  if (!parsed.ok) return fail(parsed.error);

  // The current employer is part of what gets verified, so it is locked with the documents.
  const { currentCompany, ...rest } = parsed.data;
  const data = verificationEditable(profile.verificationStatus) ? { ...rest, currentCompany } : rest;

  await db.candidateProfile.update({ where: { id: profile.id }, data });
  refresh();
  return done("Profile saved.");
}

// ───────────────────────── Verification ─────────────────────────

const noticeSchema = z
  .object({
    noticePeriodDays: zNumber("Notice period", 0, 180),
    resignationDate: zDate("Resignation date"),
    lastWorkingDay: zDate("Last working day"),
  })
  .refine((v) => v.lastWorkingDay >= v.resignationDate, {
    message: "Last working day can't be before the resignation date.",
  });

export async function saveNoticeDetails(_: ActionState, formData: FormData): Promise<ActionState> {
  const { profile } = await requireCandidate();
  if (!verificationEditable(profile.verificationStatus)) {
    return fail("Notice details are locked while verification is pending or complete.");
  }
  const parsed = parseForm(noticeSchema, formData);
  if (!parsed.ok) return fail(parsed.error);

  await db.candidateProfile.update({
    where: { id: profile.id },
    data: parsed.data,
  });
  refresh();
  return done("Notice details saved.");
}

export async function submitForVerification(): Promise<ActionState> {
  const { profile } = await requireCandidate();
  if (!verificationEditable(profile.verificationStatus)) {
    return fail("Your profile is already submitted.");
  }
  if (!profile.currentCompany) return fail("Add your current company on the Profile page first.");
  if (profile.noticePeriodDays == null || !profile.resignationDate || !profile.lastWorkingDay) {
    return fail("Save your notice period, resignation date and last working day first.");
  }

  const documents = await db.document.findMany({
    where: { candidateId: profile.id, type: { in: REQUIRED_DOCUMENTS } },
  });
  for (const type of REQUIRED_DOCUMENTS) {
    const doc = documents.find((d) => d.type === type);
    if (!doc) return fail(`Upload your ${DOCUMENT_INFO[type].label.toLowerCase()} first.`);
    if (doc.status === "REJECTED") {
      return fail(`Your ${DOCUMENT_INFO[type].label.toLowerCase()} was rejected — upload a new one first.`);
    }
  }

  await db.candidateProfile.update({
    where: { id: profile.id },
    data: {
      verificationStatus: "PENDING",
      submittedAt: new Date(),
      rejectionReason: null,
    },
  });
  refresh();
  return done("Submitted. The Readyhire team will review your documents shortly.");
}

/** Lets a candidate change verified details. Their profile is hidden until it is verified again. */
export async function reopenVerification(): Promise<ActionState> {
  const { profile } = await requireCandidate();
  if (verificationEditable(profile.verificationStatus)) return done();

  await db.candidateProfile.update({
    where: { id: profile.id },
    data: {
      verificationStatus: "NOT_SUBMITTED",
      verifiedAt: null,
      submittedAt: null,
    },
  });
  refresh();
  return done("Verification reopened. Update your details and submit again.");
}

// ───────────────────────── Offers ─────────────────────────

const offerSchema = z.object({
  company: zText("Company", 120),
  role: zText("Role", 120),
  ctcLpa: zOptionalNumber("CTC", 0, 500),
  offeredOn: zOptionalDate("Offer date"),
  joiningDate: zOptionalDate("Joining date"),
  status: z.enum(["HOLDING", "ACCEPTED", "DECLINED", "EXPIRED"], {
    error: "Choose the offer status.",
  }),
});

export async function addOffer(_: ActionState, formData: FormData): Promise<ActionState> {
  const { profile } = await requireCandidate();
  const parsed = parseForm(offerSchema, formData);
  if (!parsed.ok) return fail(parsed.error);

  await db.offer.create({ data: { candidateId: profile.id, ...parsed.data } });
  refresh();
  return done("Offer added. Attach the offer letter so Readyhire can verify it.");
}

const offerUpdateSchema = z.object({
  offerId: zId,
  status: offerSchema.shape.status,
  joiningDate: zOptionalDate("Joining date"),
});

export async function updateOffer(_: ActionState, formData: FormData): Promise<ActionState> {
  const { profile } = await requireCandidate();
  const parsed = parseForm(offerUpdateSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { offerId, status, joiningDate } = parsed.data;

  const { count } = await db.offer.updateMany({
    where: { id: offerId, candidateId: profile.id },
    data: { status, joiningDate },
  });
  if (count === 0) return fail("Offer not found.");
  refresh();
  return done("Offer updated.");
}

// ───────────────────────── Applications ─────────────────────────

const applySchema = z.object({ jobId: zId, coverNote: zOptionalText(1000) });

export async function applyToJob(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireCandidate();
  const parsed = parseForm(applySchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { jobId, coverNote } = parsed.data;

  if (profile.verificationStatus !== "VERIFIED") {
    return fail("Only verified candidates can apply. Complete verification first.");
  }
  if (profile.committedApplicationId) {
    return fail("You're committed to another role. Release that commitment before applying elsewhere.");
  }
  const joined = await db.application.findFirst({
    where: { candidateId: profile.id, status: "JOINED" },
  });
  if (joined) return fail("You've already joined a company through Readyhire.");

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { recruiter: { include: { user: true } } },
  });
  if (
    !job ||
    job.status !== "OPEN" ||
    job.recruiter.approvalStatus !== "APPROVED" ||
    job.recruiter.user.status !== "ACTIVE"
  ) {
    return fail("This job is no longer accepting applications.");
  }
  const existing = await db.application.findUnique({
    where: { jobId_candidateId: { jobId, candidateId: profile.id } },
  });
  if (existing) return fail("You've already applied to this job.");

  const application = await db.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: { jobId, candidateId: profile.id, coverNote },
    });
    await logEvent(tx, created.id, user.id, "APPLIED", coverNote);
    return created;
  });
  notify.applicationReceived(application.id);
  redirect(`/candidate/applications/${application.id}`);
}

async function ownApplication(candidateId: string, applicationId: string) {
  return db.application.findFirst({
    where: { id: applicationId, candidateId },
  });
}

export async function commitToApplication(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireCandidate();
  const parsed = parseForm(z.object({ applicationId: zId }), formData);
  if (!parsed.ok) return fail(parsed.error);

  const application = await ownApplication(profile.id, parsed.data.applicationId);
  if (!application) return fail("Application not found.");
  if (!COMMITTABLE_STATUSES.includes(application.status)) {
    return fail("You can commit once the recruiter has accepted your application.");
  }

  try {
    await db.$transaction(async (tx) => {
      // Conditional update so two concurrent commits can't both succeed.
      const { count } = await tx.candidateProfile.updateMany({
        where: { id: profile.id, committedApplicationId: null },
        data: {
          committedApplicationId: application.id,
          committedAt: new Date(),
        },
      });
      if (count === 0) throw new Error("ALREADY_COMMITTED");
      await logEvent(tx, application.id, user.id, "COMMITTED");
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_COMMITTED") {
      return fail("You can only commit to one role at a time. Release your current commitment first.");
    }
    throw error;
  }
  notify.candidateUpdate(application.id, "committed");
  refresh();
  return done("You're committed to this role. The recruiter can see your commitment.");
}

export async function releaseCommitment(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireCandidate();
  const parsed = parseForm(z.object({ reason: zReason("Reason") }), formData);
  if (!parsed.ok) return fail(parsed.error);
  if (!profile.committedApplicationId) return fail("You aren't committed to any role.");

  const applicationId = profile.committedApplicationId;
  await db.$transaction(async (tx) => {
    await tx.candidateProfile.update({
      where: { id: profile.id },
      data: { committedApplicationId: null, committedAt: null },
    });
    await logEvent(tx, applicationId, user.id, "COMMITMENT_RELEASED", parsed.data.reason);
  });
  notify.candidateUpdate(applicationId, "released", parsed.data.reason);
  refresh();
  return done("Commitment released. Releases are visible to recruiters.");
}

const withdrawSchema = z.object({
  applicationId: zId,
  reason: zReason("Reason"),
});

export async function withdrawApplication(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireCandidate();
  const parsed = parseForm(withdrawSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { applicationId, reason } = parsed.data;

  const application = await ownApplication(profile.id, applicationId);
  if (!application) return fail("Application not found.");
  if (!OPEN_APPLICATION_STATUSES.includes(application.status)) {
    return fail("This application is already closed.");
  }

  await db.$transaction(async (tx) => {
    if (profile.committedApplicationId === application.id) {
      await tx.candidateProfile.update({
        where: { id: profile.id },
        data: { committedApplicationId: null, committedAt: null },
      });
      await logEvent(tx, application.id, user.id, "COMMITMENT_RELEASED", reason);
    }
    await tx.application.update({
      where: { id: application.id },
      data: { status: "WITHDRAWN", withdrawnReason: reason },
    });
    await tx.interview.updateMany({
      where: { applicationId: application.id, status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });
    await tx.interviewInvite.updateMany({
      where: { applicationId: application.id, status: "OPEN" },
      data: { status: "CANCELLED" },
    });
    await logEvent(tx, application.id, user.id, "WITHDRAWN", reason);
  });
  notify.candidateUpdate(application.id, "withdrew", reason);
  refresh();
  return done("Application withdrawn.");
}

export async function confirmInterview(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireCandidate();
  const parsed = parseForm(z.object({ interviewId: zId }), formData);
  if (!parsed.ok) return fail(parsed.error);

  const interview = await db.interview.findFirst({
    where: {
      id: parsed.data.interviewId,
      application: { candidateId: profile.id },
    },
  });
  if (!interview || interview.status !== "SCHEDULED") return fail("This interview can't be confirmed.");

  await db.$transaction(async (tx) => {
    await tx.interview.update({
      where: { id: interview.id },
      data: { candidateConfirmed: true },
    });
    await logEvent(tx, interview.applicationId, user.id, "INTERVIEW_CONFIRMED", interview.round);
  });
  refresh();
  return done("Attendance confirmed.");
}

/** Loads an open invite for one of this candidate's applications that's still at the interview stage. */
async function ownOpenInvite(candidateId: string, inviteId: string) {
  const invite = await db.interviewInvite.findFirst({
    where: { id: inviteId, application: { candidateId } },
    include: { slots: true, application: { select: { id: true, status: true } } },
  });
  if (!invite || invite.status !== "OPEN") return null;
  if (invite.application.status !== "ACCEPTED" && invite.application.status !== "INTERVIEWING") return null;
  return invite;
}

const pickSchema = z.object({ inviteId: zId, slotId: zId });

/** Books one of the times the recruiter offered: the interview is created already confirmed. */
export async function pickInterviewTime(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireCandidate();
  const parsed = parseForm(pickSchema, formData);
  if (!parsed.ok) return fail(parsed.error);

  const invite = await ownOpenInvite(profile.id, parsed.data.inviteId);
  if (!invite) return fail("These times are no longer available.");
  const slot = invite.slots.find((s) => s.id === parsed.data.slotId);
  if (!slot || slot.startsAt <= new Date()) return fail("That time has passed. Pick another one.");

  const interview = await db.$transaction(async (tx) => {
    // Conditional update: a double click or a second tab can't book twice.
    const { count } = await tx.interviewInvite.updateMany({
      where: { id: invite.id, status: "OPEN" },
      data: { status: "BOOKED" },
    });
    if (count === 0) return null;
    const created = await tx.interview.create({
      data: {
        applicationId: invite.applicationId,
        inviteId: invite.id,
        round: invite.round,
        scheduledAt: slot.startsAt,
        durationMins: invite.durationMins,
        mode: invite.mode,
        location: invite.location,
        notes: invite.notes,
        candidateConfirmed: true,
      },
    });
    await tx.application.update({ where: { id: invite.applicationId }, data: { status: "INTERVIEWING" } });
    await logEvent(
      tx,
      invite.applicationId,
      user.id,
      "INTERVIEW_SCHEDULED",
      `${invite.round} on ${formatDateTime(slot.startsAt)}, picked by the candidate`,
    );
    return created;
  });
  if (!interview) return fail("These times are no longer available.");
  notify.interviewBooked(interview.id);
  refresh();
  return done("Interview booked. Add it to your calendar from the list below.");
}

const declineTimesSchema = z.object({
  inviteId: zId,
  note: zText("A note for the recruiter", 500),
});

export async function declineInterviewTimes(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireCandidate();
  const parsed = parseForm(declineTimesSchema, formData);
  if (!parsed.ok) return fail(parsed.error);

  const invite = await ownOpenInvite(profile.id, parsed.data.inviteId);
  if (!invite) return fail("These times are no longer available.");
  const declined = await db.$transaction(async (tx) => {
    const { count } = await tx.interviewInvite.updateMany({
      where: { id: invite.id, status: "OPEN" },
      data: { status: "DECLINED", declineNote: parsed.data.note },
    });
    if (count) await logEvent(tx, invite.applicationId, user.id, "INTERVIEW_TIMES_DECLINED", parsed.data.note);
    return count > 0;
  });
  if (!declined) return fail("These times are no longer available.");
  notify.interviewTimesDeclined(invite.id);
  refresh();
  return done("Sent. The recruiter will offer other times.");
}
