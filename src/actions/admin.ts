"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { DOCUMENT_INFO, REQUIRED_DOCUMENTS } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  type ActionState,
  done,
  fail,
  parseForm,
  zDate,
  zId,
  zNumber,
  zOptionalText,
  zReason,
} from "@/lib/forms";

const requireAdmin = () => requireRole("ADMIN");

// ───────────────────────── Candidate verification ─────────────────────────

const documentReviewSchema = z.object({
  documentId: zId,
  decision: z.enum(["VERIFIED", "REJECTED"], { error: "Choose verify or reject." }),
  note: zOptionalText(1000),
});

export async function reviewDocument(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parseForm(documentReviewSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { documentId, decision, note } = parsed.data;
  if (decision === "REJECTED" && (!note || note.length < 10)) {
    return fail("Tell the candidate what's wrong with this document.");
  }

  const document = await db.document.findUnique({ where: { id: documentId }, include: { candidate: true } });
  if (!document) return fail("Document not found.");
  if (document.type !== "OTHER_OFFER" && document.candidate.verificationStatus !== "PENDING") {
    return fail("Required documents can only be reviewed while the candidate's submission is pending.");
  }

  await db.document.update({
    where: { id: documentId },
    data: { status: decision, reviewNote: note, reviewedAt: new Date(), reviewedById: admin.id },
  });
  refresh();
  return done(`${DOCUMENT_INFO[document.type].label} ${decision === "VERIFIED" ? "verified" : "rejected"}.`);
}

const approveSchema = z.object({
  candidateId: zId,
  method: z.enum(["DOCUMENT_REVIEW", "SCREEN_SHARE", "IN_PERSON"], { error: "Choose how you verified." }),
  noticePeriodDays: zNumber("Notice period", 0, 180),
  lastWorkingDay: zDate("Last working day"),
  notes: zOptionalText(2000),
});

/** Lists the candidate profile only once every required document has been verified. */
export async function approveCandidate(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parseForm(approveSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { candidateId, method, noticePeriodDays, lastWorkingDay, notes } = parsed.data;

  const candidate = await db.candidateProfile.findUnique({
    where: { id: candidateId },
    include: { documents: { where: { type: { in: REQUIRED_DOCUMENTS } } } },
  });
  if (!candidate) return fail("Candidate not found.");
  if (candidate.verificationStatus !== "PENDING") return fail("Only submitted profiles can be verified.");
  for (const type of REQUIRED_DOCUMENTS) {
    if (!candidate.documents.some((d) => d.type === type && d.status === "VERIFIED")) {
      return fail(`Verify the ${DOCUMENT_INFO[type].label.toLowerCase()} before approving.`);
    }
  }
  if (candidate.resignationDate && lastWorkingDay < candidate.resignationDate) {
    return fail("Last working day can't be before the resignation date.");
  }

  await db.candidateProfile.update({
    where: { id: candidateId },
    data: {
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      verifiedById: admin.id,
      verificationMethod: method,
      verificationNotes: notes,
      rejectionReason: null,
      // The admin confirms the notice facts against the documents.
      noticePeriodDays,
      lastWorkingDay,
    },
  });
  refresh();
  return done("Candidate verified and now visible to recruiters.");
}

const rejectCandidateSchema = z.object({ candidateId: zId, reason: zReason("Reason for the candidate") });

export async function rejectCandidate(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(rejectCandidateSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { candidateId, reason } = parsed.data;

  const candidate = await db.candidateProfile.findUnique({ where: { id: candidateId } });
  if (!candidate) return fail("Candidate not found.");
  if (candidate.verificationStatus !== "PENDING" && candidate.verificationStatus !== "VERIFIED") {
    return fail("This profile isn't submitted.");
  }

  await db.candidateProfile.update({
    where: { id: candidateId },
    data: { verificationStatus: "REJECTED", rejectionReason: reason, verifiedAt: null },
  });
  refresh();
  return done("Verification rejected. The candidate can fix the issues and resubmit.");
}

// ───────────────────────── Recruiters ─────────────────────────

const recruiterDecisionSchema = z.object({
  recruiterId: zId,
  decision: z.enum(["APPROVED", "REJECTED"], { error: "Choose approve or reject." }),
  note: zOptionalText(1000),
});

export async function decideRecruiter(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parseForm(recruiterDecisionSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { recruiterId, decision, note } = parsed.data;
  if (decision === "REJECTED" && (!note || note.length < 10)) {
    return fail("Add a note explaining the rejection.");
  }

  const recruiter = await db.recruiterProfile.findUnique({ where: { id: recruiterId } });
  if (!recruiter) return fail("Recruiter not found.");

  await db.recruiterProfile.update({
    where: { id: recruiterId },
    data: { approvalStatus: decision, reviewNote: note, reviewedAt: new Date(), reviewedById: admin.id },
  });
  refresh();
  return done(decision === "APPROVED" ? "Recruiter approved." : "Recruiter rejected.");
}

// ───────────────────────── Users ─────────────────────────

const flagSchema = z.object({ userId: zId, flagged: z.enum(["true", "false"]), reason: zOptionalText(500) });

export async function setUserFlag(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(flagSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const flagged = parsed.data.flagged === "true";
  if (flagged && !parsed.data.reason) return fail("Add a reason for the flag.");

  await db.user.update({
    where: { id: parsed.data.userId },
    data: { flagged, flagReason: flagged ? parsed.data.reason : null },
  });
  refresh();
  return done(flagged ? "User flagged." : "Flag removed.");
}

const restrictSchema = z.object({ userId: zId, restrict: z.enum(["true", "false"]), reason: zOptionalText(500) });

export async function setUserRestriction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parseForm(restrictSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const restrict = parsed.data.restrict === "true";
  if (restrict && !parsed.data.reason) return fail("Add a reason for the restriction.");

  const user = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) return fail("User not found.");
  if (user.role === "ADMIN" || user.id === admin.id) return fail("Admins can't be restricted here.");

  await db.user.update({
    where: { id: user.id },
    data: { status: restrict ? "RESTRICTED" : "ACTIVE", restrictedReason: restrict ? parsed.data.reason : null },
  });
  refresh();
  return done(restrict ? "User restricted. They can no longer sign in." : "Restriction lifted.");
}

// ───────────────────────── Ghosting reports ─────────────────────────

const reportSchema = z.object({
  reportId: zId,
  decision: z.enum(["UPHELD", "DISMISSED"], { error: "Choose uphold or dismiss." }),
  note: zReason("Resolution note"),
});

export async function resolveGhostingReport(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(reportSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { reportId, decision, note } = parsed.data;

  const report = await db.ghostingReport.findUnique({ where: { id: reportId } });
  if (!report) return fail("Report not found.");
  if (report.status !== "OPEN") return fail("This report is already resolved.");

  await db.ghostingReport.update({
    where: { id: reportId },
    data: { status: decision, resolutionNote: note, resolvedAt: new Date() },
  });
  refresh();
  return done(decision === "UPHELD" ? "Report upheld. Recruiters now see it on the candidate's profile." : "Report dismissed.");
}
