import { describe, expect, it } from "vitest";
import { bookableSlots, interviewReminderStage, offeredTimesProblem } from "@/lib/interviews";

const now = new Date("2026-11-03T06:00:00.000Z");
const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

describe("offeredTimesProblem", () => {
  it("accepts two or three distinct times between an hour and 60 days ahead", () => {
    expect(offeredTimesProblem([inHours(2), inHours(26)], now)).toBeNull();
    expect(offeredTimesProblem([inHours(2), inHours(26), inHours(50)], now)).toBeNull();
  });

  it("rejects too few, too many, duplicate, too soon and too far", () => {
    expect(offeredTimesProblem([inHours(2)], now)).toMatch(/at least 2/);
    expect(offeredTimesProblem([inHours(2), inHours(3), inHours(4), inHours(5)], now)).toMatch(/at most 3/);
    expect(offeredTimesProblem([inHours(2), inHours(2)], now)).toMatch(/different/);
    expect(offeredTimesProblem([inHours(0.5), inHours(3)], now)).toMatch(/an hour from now/);
    expect(offeredTimesProblem([inHours(2), inHours(24 * 61)], now)).toMatch(/60 days/);
  });
});

describe("bookableSlots", () => {
  it("keeps future times, earliest first", () => {
    const slots = [{ startsAt: inHours(30) }, { startsAt: inHours(-1) }, { startsAt: inHours(5) }];
    expect(bookableSlots(slots, now).map((s) => s.startsAt)).toEqual([inHours(5), inHours(30)]);
  });
});

describe("interviewReminderStage", () => {
  const none = { reminder24hSentAt: null, reminder2hSentAt: null };
  const at = (h: number, sent: Partial<{ reminder24hSentAt: Date; reminder2hSentAt: Date }> = {}) =>
    interviewReminderStage({ scheduledAt: inHours(h), ...none, ...sent }, now);

  it("sends a day-ahead and a two-hour reminder, once each", () => {
    expect(at(30)).toBeNull();
    expect(at(20)).toBe("24h");
    expect(at(20, { reminder24hSentAt: now })).toBeNull();
    expect(at(1.5, { reminder24hSentAt: now })).toBe("2h");
    expect(at(1.5, { reminder2hSentAt: now })).toBeNull();
    expect(at(-0.5)).toBeNull();
  });

  it("goes straight to the two-hour reminder when the day-ahead one was missed", () => {
    expect(at(1)).toBe("2h");
    expect(at(10, { reminder2hSentAt: now })).toBeNull();
  });
});
