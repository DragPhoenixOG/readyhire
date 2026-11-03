const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const MIN_OFFERED_TIMES = 2;
export const MAX_OFFERED_TIMES = 3;
/** Offered times must leave the candidate time to pick and prepare. */
export const MIN_LEAD_MINUTES = 60;
export const MAX_DAYS_AHEAD = 60;

/** Checks the times a recruiter offers: 2-3 distinct times, at least an hour ahead and within two months. */
export function offeredTimesProblem(times: Date[], now = new Date()): string | null {
  const distinct = new Set(times.map((t) => t.getTime()));
  if (distinct.size !== times.length) return "Each time you offer must be different.";
  if (times.length < MIN_OFFERED_TIMES) return `Offer at least ${MIN_OFFERED_TIMES} times.`;
  if (times.length > MAX_OFFERED_TIMES) return `Offer at most ${MAX_OFFERED_TIMES} times.`;
  if (times.some((t) => t.getTime() < now.getTime() + MIN_LEAD_MINUTES * MINUTE)) {
    return "Offered times must be at least an hour from now.";
  }
  if (times.some((t) => t.getTime() > now.getTime() + MAX_DAYS_AHEAD * 24 * HOUR)) {
    return `Offered times must be within the next ${MAX_DAYS_AHEAD} days.`;
  }
  return null;
}

/** Offered times the candidate can still pick, earliest first. */
export function bookableSlots<T extends { startsAt: Date }>(slots: T[], now = new Date()) {
  return slots.filter((s) => s.startsAt > now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export type InterviewReminderStage = "24h" | "2h";

/**
 * The reminder a scheduled interview needs now, if any: one about a day ahead, one two hours ahead. Each is sent at
 * most once; when the scheduler runs late, the 2-hour reminder replaces a 24-hour one that wasn't sent.
 */
export function interviewReminderStage(
  i: { scheduledAt: Date; reminder24hSentAt: Date | null; reminder2hSentAt: Date | null },
  now = new Date(),
): InterviewReminderStage | null {
  const until = i.scheduledAt.getTime() - now.getTime();
  if (until <= 0) return null;
  if (until <= 2 * HOUR) return i.reminder2hSentAt ? null : "2h";
  if (until <= 24 * HOUR) return i.reminder24hSentAt || i.reminder2hSentAt ? null : "24h";
  return null;
}
