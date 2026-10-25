import { describe, expect, it } from "vitest";
import { responseDueAt, responseStats } from "@/lib/jobs";

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
