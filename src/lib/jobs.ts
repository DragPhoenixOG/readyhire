import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { RESPONSE_SLA_HOURS } from "@/lib/constants";
import { hoursSince } from "@/lib/format";

/** Jobs a candidate can see: open, posted by an approved recruiter whose account is active. */
export const visibleJobWhere = {
  status: "OPEN",
  recruiter: { approvalStatus: "APPROVED", user: { status: "ACTIVE" } },
} satisfies Prisma.JobWhereInput;

/** When an application that is still waiting for a response becomes overdue. */
export function responseDueAt(appliedAt: Date) {
  return new Date(appliedAt.getTime() + RESPONSE_SLA_HOURS * 60 * 60 * 1000);
}

/** Applications that have waited longer than the response SLA. */
export function overdueWhere(now = new Date()) {
  return {
    status: "APPLIED",
    createdAt: {
      lt: new Date(now.getTime() - RESPONSE_SLA_HOURS * 60 * 60 * 1000),
    },
  } satisfies Prisma.ApplicationWhereInput;
}

type ResponseFacts = {
  status: ApplicationStatus;
  createdAt: Date;
  respondedAt: Date | null;
};

/**
 * Response discipline for a set of applications. The rate is answered / (answered + still waiting);
 * applications withdrawn before a reply count towards neither.
 */
export function responseStats(applications: ResponseFacts[], now = new Date()) {
  const responded = applications.filter((a) => a.respondedAt);
  const awaiting = applications.filter((a) => a.status === "APPLIED");
  const totalHours = responded.reduce((n, a) => n + hoursSince(a.createdAt, a.respondedAt!), 0);
  return {
    responded: responded.length,
    awaiting: awaiting.length,
    overdue: awaiting.filter((a) => responseDueAt(a.createdAt) < now).length,
    expected: responded.length + awaiting.length,
    avgHours: responded.length ? totalHours / responded.length : null,
  };
}

export type ReplyReminderStage = "early" | "dueSoon" | "overdue";

type ReminderFacts = {
  createdAt: Date;
  earlyReminderSentAt: Date | null;
  reminderSentAt: Date | null;
  overdueAlertSentAt: Date | null;
};

/**
 * The reply reminder an unanswered application needs now, if any: 48 hours left, 24 hours left, then overdue.
 * Each is sent at most once, and a later one supersedes an earlier one that was missed.
 */
export function replyReminderStage(a: ReminderFacts, now = new Date()): ReplyReminderStage | null {
  const waited = hoursSince(a.createdAt, now);
  if (waited >= RESPONSE_SLA_HOURS) return a.overdueAlertSentAt ? null : "overdue";
  if (waited >= RESPONSE_SLA_HOURS - 24) return a.reminderSentAt ? null : "dueSoon";
  if (waited >= RESPONSE_SLA_HOURS - 48) return a.earlyReminderSentAt || a.reminderSentAt ? null : "early";
  return null;
}
