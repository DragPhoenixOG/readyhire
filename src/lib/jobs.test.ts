import { describe, expect, it } from "vitest";
import { replyReminderStage, responseDueAt, responseStats } from "@/lib/jobs";

const now = new Date("2026-10-25T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

describe("response deadline", () => {
  it("is 72 hours after the application", () => {
    expect(responseDueAt(hoursAgo(72)).toISOString()).toBe(now.toISOString());
  });
});

describe("responseStats", () => {
  it("measures answered vs waiting and ignores applications withdrawn before a reply", () => {
    const stats = responseStats(
      [
        { status: "ACCEPTED", createdAt: hoursAgo(50), respondedAt: hoursAgo(40) }, // 10 h
        { status: "REJECTED", createdAt: hoursAgo(30), respondedAt: hoursAgo(28) }, // 2 h
        { status: "APPLIED", createdAt: hoursAgo(80), respondedAt: null }, // overdue
        { status: "APPLIED", createdAt: hoursAgo(5), respondedAt: null },
        { status: "WITHDRAWN", createdAt: hoursAgo(90), respondedAt: null },
      ],
      now,
    );
    expect(stats).toEqual({ responded: 2, awaiting: 2, overdue: 1, expected: 4, avgHours: 6 });
  });

  it("has no average before any reply", () => {
    expect(responseStats([], now).avgHours).toBeNull();
  });
});

describe("replyReminderStage", () => {
  type Sent = { earlyReminderSentAt: Date | null; reminderSentAt: Date | null; overdueAlertSentAt: Date | null };
  const unsent: Sent = { earlyReminderSentAt: null, reminderSentAt: null, overdueAlertSentAt: null };
  const at = (hours: number, sent: Partial<Sent> = {}) =>
    replyReminderStage({ createdAt: hoursAgo(hours), ...unsent, ...sent }, now);

  it("waits a day, then sends 48-hours-left, 24-hours-left and overdue reminders once each", () => {
    expect(at(10)).toBeNull();
    expect(at(25)).toBe("early");
    expect(at(25, { earlyReminderSentAt: now })).toBeNull();
    expect(at(50, { earlyReminderSentAt: now })).toBe("dueSoon");
    expect(at(50, { reminderSentAt: now })).toBeNull();
    expect(at(80, { reminderSentAt: now })).toBe("overdue");
    expect(at(80, { overdueAlertSentAt: now })).toBeNull();
  });

  it("skips straight to the current stage when earlier ones were missed", () => {
    expect(at(50)).toBe("dueSoon");
    expect(at(80)).toBe("overdue");
  });
});
