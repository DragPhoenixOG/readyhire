import { describe, expect, it } from "vitest";
import {
  daysFromToday,
  formatCtcRange,
  formatHours,
  parseDateInput,
  parseDateTimeInput,
  percent,
  splitList,
  toDateInputValue,
} from "@/lib/format";

describe("IST date handling", () => {
  it("treats date inputs as calendar days in India", () => {
    const date = parseDateInput("2026-11-19")!;
    expect(date.toISOString()).toBe("2026-11-18T18:30:00.000Z");
    expect(toDateInputValue(date)).toBe("2026-11-19");
  });

  it("treats datetime inputs as IST wall-clock time", () => {
    expect(parseDateTimeInput("2026-11-02T10:30")!.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("rejects malformed values", () => {
    expect(parseDateInput("19/11/2026")).toBeNull();
    expect(parseDateTimeInput("2026-11-02 10:30")).toBeNull();
  });

  it("counts calendar days in IST, not 24-hour periods", () => {
    // 11:00 pm IST on 18 Nov is still "today" for 18 Nov and one day before 19 Nov.
    const now = new Date("2026-11-18T17:30:00.000Z");
    expect(daysFromToday(parseDateInput("2026-11-19")!, now)).toBe(1);
    expect(daysFromToday(parseDateInput("2026-11-18")!, now)).toBe(0);
    expect(daysFromToday(parseDateInput("2026-11-10")!, now)).toBe(-8);
  });
});

describe("formatHours", () => {
  it("formats minutes, hours and days", () => {
    expect(formatHours(0.25)).toBe("15 min");
    expect(formatHours(30)).toBe("30 h");
    expect(formatHours(72)).toBe("3 days");
    expect(formatHours(66)).toBe("2 d 18 h");
  });

  it("never shows 24 leftover hours", () => {
    expect(formatHours(71.6)).toBe("3 days");
  });
});

describe("small formatters", () => {
  it("formats CTC ranges", () => {
    expect(formatCtcRange(28, 40)).toBe("₹28–40 LPA");
    expect(formatCtcRange(null, 18)).toBe("₹18 LPA");
    expect(formatCtcRange(null, null)).toBe("Not disclosed");
  });

  it("splits comma lists and computes percentages", () => {
    expect(splitList(" Java, , Spring Boot ,AWS")).toEqual(["Java", "Spring Boot", "AWS"]);
    expect(percent(2, 3)).toBe("67%");
    expect(percent(1, 0)).toBe("—");
  });
});
