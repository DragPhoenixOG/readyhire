import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export const EVENT_LABEL = {
  APPLIED: "Applied",
  ACCEPTED: "Application accepted",
  REJECTED: "Application rejected",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  INTERVIEW_UPDATED: "Interview updated",
  INTERVIEW_CONFIRMED: "Candidate confirmed the interview",
  OFFERED: "Offer extended",
  COMMITTED: "Candidate committed to this role",
  COMMITMENT_RELEASED: "Candidate released their commitment",
  JOINED: "Candidate joined",
  NOT_JOINED: "Candidate did not join",
  WITHDRAWN: "Candidate withdrew",
  GHOSTING_REPORTED: "Ghosting reported",
} as const;

export type EventType = keyof typeof EVENT_LABEL;

/** Events only recruiters and admins see on the timeline. */
export const INTERNAL_EVENTS: EventType[] = ["GHOSTING_REPORTED"];

export function eventLabel(type: string) {
  return EVENT_LABEL[type as EventType] ?? type;
}

export function logEvent(
  tx: Prisma.TransactionClient,
  applicationId: string,
  actorId: string | null,
  type: EventType,
  message?: string | null,
) {
  return tx.applicationEvent.create({
    data: { applicationId, actorId, type, message: message ?? null },
  });
}
