import { describe, expect, it } from "vitest";
import { checkRecruiterDomain } from "@/lib/domain";

describe("checkRecruiterDomain", () => {
  it("rejects personal and disposable mailboxes", () => {
    for (const email of ["a@gmail.com", "a@outlook.com", "a@yahoo.co.in", "a@mailinator.com"]) {
      expect(checkRecruiterDomain(email, null)).toMatch(/Personal email providers/);
    }
  });

  it("rejects malformed domains", () => {
    expect(checkRecruiterDomain("a@localhost", null)).toMatch(/doesn't look valid/);
  });

  it("accepts a company domain without a website", () => {
    expect(checkRecruiterDomain("lead@northwind.com", null)).toBeNull();
  });

  it("requires the email domain to belong to the website", () => {
    expect(checkRecruiterDomain("lead@northwind.com", "https://www.northwind.com/careers")).toBeNull();
    expect(checkRecruiterDomain("lead@in.northwind.com", "northwind.com")).toBeNull();
    expect(checkRecruiterDomain("lead@northwind.com", "careers.northwind.com")).toBeNull();
    expect(checkRecruiterDomain("lead@tailspin.com", "northwind.com")).toMatch(/must match/);
  });

  it("rejects an unparseable website", () => {
    expect(checkRecruiterDomain("lead@northwind.com", "not a url")).toMatch(/valid company website/);
  });
});
