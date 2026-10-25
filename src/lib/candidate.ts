import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ACTIVE_OFFER_STATUSES } from "@/lib/constants";
import { addDays, daysFromToday } from "@/lib/format";

/** Everything needed to compute the trust signals recruiters and admins see for a candidate. */
export const candidateSummaryInclude = {
  user: { select: { id: true, name: true, email: true, status: true, flagged: true, flagReason: true } },
  offers: { select: { status: true, document: { select: { status: true } } } },
  applications: {
    select: {
      id: true,
      status: true,
      outcomeAt: true,
      job: {
        select: { id: true, title: true, recruiterId: true, company: { select: { name: true } } },
      },
      events: { where: { type: "COMMITMENT_RELEASED" }, select: { id: true } },
    },
  },
  ghostingReports: { where: { status: "UPHELD" }, select: { id: true } },
} satisfies Prisma.CandidateProfileInclude;

export type CandidateWithSummary = Prisma.CandidateProfileGetPayload<{
  include: typeof candidateSummaryInclude;
}>;

export type CandidateSummary = ReturnType<typeof summarizeCandidate>;

export function summarizeCandidate(candidate: CandidateWithSummary, now = new Date()) {
  const externalActive = candidate.offers.filter((o) => ACTIVE_OFFER_STATUSES.includes(o.status));
  const platformOffers = candidate.applications.filter((a) => a.status === "OFFERED");
  const committed = candidate.committedApplicationId
    ? candidate.applications.find((a) => a.id === candidate.committedApplicationId)
    : undefined;
  const joined = candidate.applications.find((a) => a.status === "JOINED");
  const lastWorkingDay = candidate.lastWorkingDay;

  return {
    activeOffers: externalActive.length + platformOffers.length,
    externalActiveOffers: externalActive.length,
    proofVerifiedOffers: externalActive.filter((o) => o.document?.status === "VERIFIED").length,
    platformOffers: platformOffers.length,
    commitment: committed
      ? {
          applicationId: committed.id,
          jobId: committed.job.id,
          jobTitle: committed.job.title,
          companyName: committed.job.company.name,
          recruiterId: committed.job.recruiterId,
        }
      : null,
    releases: candidate.applications.reduce((n, a) => n + a.events.length, 0),
    upheldGhosting: candidate.ghostingReports.length,
    joined: joined
      ? { jobTitle: joined.job.title, companyName: joined.job.company.name, at: joined.outcomeAt }
      : null,
    notice: {
      verified: candidate.verificationStatus === "VERIFIED",
      days: candidate.noticePeriodDays,
      resignationDate: candidate.resignationDate,
      lastWorkingDay,
      daysToLastWorkingDay: lastWorkingDay ? daysFromToday(lastWorkingDay, now) : null,
      availableFrom: lastWorkingDay ? addDays(lastWorkingDay, 1) : null,
    },
  };
}

/** Verified, active candidates who have not already joined a company through Readyhire. */
export const listableCandidateWhere = {
  verificationStatus: "VERIFIED",
  user: { status: "ACTIVE" },
  applications: { none: { status: "JOINED" } },
} satisfies Prisma.CandidateProfileWhereInput;

/** Notice details, required documents and current company can only change before submission or after a rejection. */
export function verificationEditable(status: string) {
  return status === "NOT_SUBMITTED" || status === "REJECTED";
}
