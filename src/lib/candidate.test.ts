import { describe, expect, it } from "vitest";
import { type CandidateWithSummary, summarizeCandidate, verificationEditable } from "@/lib/candidate";
import { parseDateInput } from "@/lib/format";

const now = new Date("2026-10-25T06:30:00.000Z"); // noon IST

function application(id: string, status: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    status,
    outcomeAt: null,
    job: { id: `job-${id}`, title: `Role ${id}`, recruiterId: "rec-1", company: { name: `Company ${id}` } },
    events: [],
    ...overrides,
  };
}

function candidate(overrides: Partial<Record<keyof CandidateWithSummary, unknown>> = {}) {
  return {
    verificationStatus: "VERIFIED",
    noticePeriodDays: 60,
    resignationDate: parseDateInput("2026-09-25"),
    lastWorkingDay: parseDateInput("2026-11-24"),
    committedApplicationId: null,
    offers: [],
    applications: [],
    ghostingReports: [],
    ...overrides,
  } as unknown as CandidateWithSummary;
}

describe("summarizeCandidate", () => {
  it("counts declared offers still in hand plus offers extended on Readyhire", () => {
    const summary = summarizeCandidate(
      candidate({
        offers: [
          { status: "HOLDING", document: { status: "VERIFIED" } },
          { status: "ACCEPTED", document: null },
          { status: "DECLINED", document: { status: "VERIFIED" } },
          { status: "EXPIRED", document: null },
        ],
        applications: [application("a", "OFFERED"), application("b", "INTERVIEWING")],
      }),
      now,
    );
    expect(summary.externalActiveOffers).toBe(2);
    expect(summary.proofVerifiedOffers).toBe(1);
    expect(summary.platformOffers).toBe(1);
    expect(summary.activeOffers).toBe(3);
  });

  it("reports the commitment, releases and upheld ghosting reports", () => {
    const summary = summarizeCandidate(
      candidate({
        committedApplicationId: "b",
        applications: [
          application("a", "WITHDRAWN", { events: [{ id: "e1" }] }),
          application("b", "OFFERED", { events: [{ id: "e2" }] }),
        ],
        ghostingReports: [{ id: "g1" }],
      }),
      now,
    );
    expect(summary.commitment).toMatchObject({ applicationId: "b", jobTitle: "Role b", recruiterId: "rec-1" });
    expect(summary.releases).toBe(2);
    expect(summary.upheldGhosting).toBe(1);
  });

  it("works out when the candidate can join", () => {
    const { notice } = summarizeCandidate(candidate(), now);
    expect(notice.verified).toBe(true);
    expect(notice.daysToLastWorkingDay).toBe(30);
    expect(notice.availableFrom!.toISOString()).toBe(parseDateInput("2026-11-25")!.toISOString());
  });

  it("notes when the candidate has already joined", () => {
    const summary = summarizeCandidate(candidate({ applications: [application("a", "JOINED")] }), now);
    expect(summary.joined).toMatchObject({ companyName: "Company a" });
  });
});

describe("verificationEditable", () => {
  it("allows edits only before submission or after a rejection", () => {
    expect(verificationEditable("NOT_SUBMITTED")).toBe(true);
    expect(verificationEditable("REJECTED")).toBe(true);
    expect(verificationEditable("PENDING")).toBe(false);
    expect(verificationEditable("VERIFIED")).toBe(false);
  });
});
