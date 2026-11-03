import { describe, expect, it } from "vitest";
import type { ResponseContext } from "@/lib/ai/context";
import { draftSchemas, templateDraft } from "@/lib/ai/drafts";

const ctx: ResponseContext = {
  job: {
    title: "Backend Engineer",
    company: "Northwind",
    location: "Hyderabad",
    workMode: "HYBRID",
    experience: "4-8 years",
    minExperienceYears: 4,
    skills: ["Java", "Spring Boot", "AWS"],
    joiningWindowDays: 30,
    description: "Build payment services.",
  },
  candidate: {
    firstName: "Ananya",
    headline: "Backend engineer",
    currentTitle: "Senior Engineer",
    experienceYears: 6,
    skills: ["java", "Kafka"],
    city: "Hyderabad",
    noticeVerified: true,
    daysUntilAvailable: 21,
    coverNote: null,
  },
};

describe("templateDraft", () => {
  it("writes an acceptance that names matching skills and passes the reply checks", () => {
    const draft = templateDraft("accept", ctx);
    expect(draft.kind).toBe("accept");
    if (draft.kind !== "accept") return;
    expect(draft.message).toContain("Hi Ananya");
    expect(draft.message).toContain("java");
    expect(draftSchemas.accept.safeParse(draft).success).toBe(true);
  });

  it("picks the rejection reason from the actual gap", () => {
    const late = templateDraft("reject", { ...ctx, candidate: { ...ctx.candidate, daysUntilAvailable: 60 } });
    const junior = templateDraft("reject", { ...ctx, candidate: { ...ctx.candidate, experienceYears: 2 } });
    const skills = templateDraft("reject", ctx);
    const noGap = templateDraft("reject", { ...ctx, candidate: { ...ctx.candidate, skills: ctx.job.skills } });
    expect(late.kind === "reject" && late.category).toBe("Joining timeline doesn't fit");
    expect(junior.kind === "reject" && junior.category).toBe("Experience level doesn't match");
    expect(skills.kind === "reject" && skills.category).toBe("Skills don't match the role");
    expect(noGap.kind === "reject" && noGap.category).toBe("Other");
    for (const draft of [late, junior, skills, noGap]) expect(draftSchemas.reject.safeParse(draft).success).toBe(true);
  });

  it("only names skills the candidate is missing", () => {
    const draft = templateDraft("reject", ctx);
    if (draft.kind !== "reject") throw new Error("expected a rejection");
    expect(draft.reason).toContain("Spring Boot and AWS");
    expect(draft.reason).not.toMatch(/Java/i);
  });
});
