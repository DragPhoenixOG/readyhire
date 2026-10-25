import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseForm, zDate, zEmail, zOptionalNumber, zReason } from "@/lib/forms";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseForm", () => {
  const schema = z.object({ email: zEmail, reason: zReason("Reason"), ctc: zOptionalNumber("CTC", 0, 500) });

  it("normalises valid input", () => {
    const result = parseForm(
      schema,
      form({ email: "  Lead@Northwind.COM ", reason: "We filled the role internally.", ctc: "" }),
    );
    expect(result).toEqual({
      ok: true,
      data: { email: "lead@northwind.com", reason: "We filled the role internally.", ctc: null },
    });
  });

  it("returns the first problem as a readable message", () => {
    const result = parseForm(schema, form({ email: "lead@northwind.com", reason: "No.", ctc: "12" }));
    expect(result).toEqual({ ok: false, error: "Reason must be at least 15 characters so it is useful." });
  });

  it("rejects numbers outside the allowed range", () => {
    const result = parseForm(schema, form({ email: "a@b.co", reason: "A reason that is long enough.", ctc: "900" }));
    expect(result.ok).toBe(false);
  });
});

describe("zDate", () => {
  it("parses YYYY-MM-DD and rejects anything else", () => {
    expect(zDate("Date").safeParse("2026-11-19").success).toBe(true);
    expect(zDate("Date").safeParse("").success).toBe(false);
    expect(zDate("Date").safeParse("19-11-2026").success).toBe(false);
  });
});
