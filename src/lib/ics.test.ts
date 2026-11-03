import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/ics";

const event = {
  uid: "interview-abc@readyhire",
  start: new Date("2026-11-05T05:00:00.000Z"),
  durationMins: 45,
  summary: "Technical round 1 — Backend Engineer, Northwind",
  location: "https://meet.example.com/abc",
  description: "Interview for Backend Engineer at Northwind; bring ID, please.",
  url: "https://readyhire.example/candidate/applications/app1",
};

describe("buildIcs", () => {
  const ics = buildIcs(event, new Date("2026-11-03T06:00:00.000Z"));

  it("writes one event with UTC times, CRLF line endings and the end from the duration", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261105T050000Z\r\n");
    expect(ics).toContain("DTEND:20261105T054500Z\r\n");
    expect(ics).toContain("DTSTAMP:20261103T060000Z\r\n");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes text and folds long lines at 75 octets", () => {
    expect(ics).toContain("Northwind\; bring ID\\, please.");
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(`DESCRIPTION:Interview for Backend Engineer`);
    expect(unfolded).toContain("Details: https://readyhire.example/candidate/applications/app1");
  });

  it("marks cancelled interviews so calendars remove them", () => {
    const cancelled = buildIcs({ ...event, cancelled: true, sequence: 2 });
    expect(cancelled).toContain("METHOD:CANCEL");
    expect(cancelled).toContain("STATUS:CANCELLED");
    expect(cancelled).toContain("SEQUENCE:2");
  });
});
