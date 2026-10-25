import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { emails } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/transport";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { responseDueAt } from "@/lib/jobs";
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
 * Hourly job (Vercel Cron, or any scheduler that can send the bearer token):
 * reminds recruiters about applications due within 24 hours, alerts once when they become
 * overdue, and prunes expired rate-limit windows and auth tokens.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const now = new Date();
  const overdueBefore = new Date(now.getTime() - RESPONSE_SLA_HOURS * HOUR);
  const dueSoonBefore = new Date(now.getTime() - (RESPONSE_SLA_HOURS - 24) * HOUR);

  const pending = await db.application.findMany({
    where: {
      status: "APPLIED",
      createdAt: { lt: dueSoonBefore },
      OR: [{ reminderSentAt: null }, { createdAt: { lt: overdueBefore }, overdueAlertSentAt: null }],
      job: { recruiter: { user: { status: "ACTIVE" } } },
    },
    include: {
      candidate: { include: { user: { select: { name: true } } } },
      job: { include: { recruiter: { include: { user: { select: { id: true, name: true, email: true } } } } } },
    },
  });

  // One email per recruiter covering everything that needs attention.
  const byRecruiter = new Map<string, { user: { name: string; email: string }; dueSoon: typeof pending; overdue: typeof pending }>();
  for (const application of pending) {
    const user = application.job.recruiter.user;
    const entry = byRecruiter.get(user.id) ?? { user, dueSoon: [], overdue: [] };
    if (application.createdAt < overdueBefore) {
      if (!application.overdueAlertSentAt) entry.overdue.push(application);
    } else if (!application.reminderSentAt) {
      entry.dueSoon.push(application);
    }
    byRecruiter.set(user.id, entry);
  }

  let sent = 0;
  for (const { user, dueSoon, overdue } of byRecruiter.values()) {
    if (dueSoon.length + overdue.length === 0) continue;
    const line = (a: (typeof pending)[number]) =>
      `${a.candidate.user.name} — ${a.job.title} (due ${formatDateTime(responseDueAt(a.createdAt))})`;
    const ok = await sendEmail({ to: user.email, ...emails.responseReminder(user.name, dueSoon.map(line), overdue.map(line)) });
    if (!ok) continue;
    sent += 1;
    await db.application.updateMany({ where: { id: { in: dueSoon.map((a) => a.id) } }, data: { reminderSentAt: now } });
    await db.application.updateMany({
      where: { id: { in: overdue.map((a) => a.id) } },
      data: { overdueAlertSentAt: now, reminderSentAt: now },
    });
  }

  await pruneRateLimits();
  await db.authToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } });

  return Response.json({ ok: true, recruitersEmailed: sent, applicationsChecked: pending.length });
}
