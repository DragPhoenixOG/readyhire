import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { emails } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/transport";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { expireInterviewInvites, sendInterviewReminders } from "@/lib/interview-jobs";
import { replyReminderStage, responseDueAt } from "@/lib/jobs";
import { RESPONSE_SLA_HOURS } from "@/lib/constants";
import { pruneRateLimits } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;

function authorized(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) return env.APP_ENV === "development" || env.APP_ENV === "test";
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Scheduled job (Vercel Cron, or any scheduler that can send the bearer token; safe to run as often as every few
 * minutes): reminds recruiters about unanswered applications with 48 and 24 hours left, alerts once when they become
 * overdue, reminds candidates and recruiters about interviews a day and two hours ahead, expires interview times
 * that have all passed, and prunes expired rate-limit windows and auth tokens.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const now = new Date();
  const earlyBefore = new Date(now.getTime() - (RESPONSE_SLA_HOURS - 48) * HOUR);

  const pending = await db.application.findMany({
    where: {
      status: "APPLIED",
      createdAt: { lt: earlyBefore },
      OR: [{ earlyReminderSentAt: null }, { reminderSentAt: null }, { overdueAlertSentAt: null }],
      job: { recruiter: { user: { status: "ACTIVE" } } },
    },
    include: {
      candidate: { include: { user: { select: { name: true } } } },
      job: {
        include: {
          recruiter: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  // One email per recruiter covering everything that needs attention.
  type Pending = (typeof pending)[number];
  const byRecruiter = new Map<
    string,
    { user: { name: string; email: string }; early: Pending[]; dueSoon: Pending[]; overdue: Pending[] }
  >();
  for (const application of pending) {
    const stage = replyReminderStage(application, now);
    if (!stage) continue;
    const user = application.job.recruiter.user;
    const entry = byRecruiter.get(user.id) ?? { user, early: [], dueSoon: [], overdue: [] };
    entry[stage].push(application);
    byRecruiter.set(user.id, entry);
  }

  let sent = 0;
  for (const { user, early, dueSoon, overdue } of byRecruiter.values()) {
    const line = (a: Pending) =>
      `${a.candidate.user.name} — ${a.job.title} (due ${formatDateTime(responseDueAt(a.createdAt))})`;
    const ok = await sendEmail({
      to: user.email,
      ...emails.responseReminder(user.name, early.map(line), dueSoon.map(line), overdue.map(line)),
    });
    if (!ok) continue;
    sent += 1;
    // Later stages also mark the earlier ones as done, so a missed early reminder is never sent late.
    const ids = (list: Pending[]) => ({ id: { in: list.map((a) => a.id) } });
    await db.application.updateMany({ where: ids(early), data: { earlyReminderSentAt: now } });
    await db.application.updateMany({ where: ids(dueSoon), data: { reminderSentAt: now, earlyReminderSentAt: now } });
    await db.application.updateMany({
      where: ids(overdue),
      data: { overdueAlertSentAt: now, reminderSentAt: now, earlyReminderSentAt: now },
    });
  }

  const interviewReminders = await sendInterviewReminders(now);
  const invitesExpired = await expireInterviewInvites(now);

  await pruneRateLimits();
  await db.authToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
  });

  return Response.json({
    ok: true,
    recruitersEmailed: sent,
    applicationsChecked: pending.length,
    interviewReminders,
    invitesExpired,
  });
}
