import { describe, expect, it } from "vitest";
import { buildResponseContext } from "@/lib/ai/context";

const source = {
  coverNote: "Happy to relocate.",
  job: {
    title: "Backend Engineer",
    location: "Hyderabad",
    workMode: "HYBRID",
    minExperience: 4,
    maxExperience: 8,
    skills: "Java, Spring Boot, AWS",
    maxJoiningDays: 30,
    description: "Build payment services.",
    company: { name: "Northwind", domain: "northwind.com" },
  },
  candidate: {
    headline: "Backend engineer",
    currentTitle: "Senior Engineer",
    currentCompany: "Litware",
    experienceYears: 6,
    skills: "Java, Kafka",
    city: "Hyderabad",
    phone: "+91 98480 11111",
    user: { name: "Ananya Sharma", email: "ananya.sharma@example.com" },
  },
  summary: { notice: { verified: true, daysToLastWorkingDay: 20 } },
};

describe("buildResponseContext", () => {
  it("keeps only what a reply needs", () => {
    const ctx = buildResponseContext(source);
    expect(ctx.candidate.firstName).toBe("Ananya");
    expect(ctx.candidate.daysUntilAvailable).toBe(21);
    expect(ctx.job.experience).toBe("4-8 years");
    expect(ctx.job.skills).toEqual(["Java", "Spring Boot", "AWS"]);
  });

  it("never includes contact details, the surname or the current employer", () => {
    const json = JSON.stringify(buildResponseContext(source));
    for (const secret of ["ananya.sharma@example.com", "+91 98480 11111", "Sharma", "Litware", "northwind.com"]) {
      expect(json).not.toContain(secret);
    }
  });

  it("treats an availability date in the past as available now", () => {
    const ctx = buildResponseContext({ ...source, summary: { notice: { verified: true, daysToLastWorkingDay: -10 } } });
    expect(ctx.candidate.daysUntilAvailable).toBe(0);
  });
});
