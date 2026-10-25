import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, cleanFileName, matchesSignature, uploadProblem } from "@/lib/upload-rules";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("uploadProblem", () => {
  it("allows PDFs and common images up to 5 MB", () => {
    expect(uploadProblem("application/pdf", 1000)).toBeNull();
    expect(uploadProblem("image/webp", MAX_UPLOAD_BYTES)).toBeNull();
  });

  it("rejects other types, empty files and large files", () => {
    expect(uploadProblem("application/zip", 1000)).toMatch(/PDF, PNG, JPG or WebP/);
    expect(uploadProblem("application/pdf", 0)).toMatch(/empty/);
    expect(uploadProblem("application/pdf", MAX_UPLOAD_BYTES + 1)).toMatch(/5 MB/);
  });

  it("accepts only PDF resumes", () => {
    expect(uploadProblem("application/pdf", 1000, "resume")).toBeNull();
    expect(uploadProblem("image/png", 1000, "resume")).toMatch(/resume as a PDF/);
    expect(uploadProblem("application/pdf", MAX_UPLOAD_BYTES + 1, "resume")).toMatch(/5 MB/);
  });
});

describe("matchesSignature", () => {
  it("recognises real file headers", () => {
    expect(matchesSignature("application/pdf", bytes("%PDF-1.7"))).toBe(true);
    expect(matchesSignature("image/png", bytes(0x89, "PNG", 0x0d, 0x0a))).toBe(true);
    expect(matchesSignature("image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(matchesSignature("image/webp", bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe(true);
  });

  it("rejects files whose content doesn't match the declared type", () => {
    expect(matchesSignature("application/pdf", bytes("<html>"))).toBe(false);
    expect(matchesSignature("image/png", bytes("%PDF-1.7"))).toBe(false);
    expect(matchesSignature("text/plain", bytes("hello"))).toBe(false);
  });
});

describe("cleanFileName", () => {
  it("drops directories and control characters", () => {
    expect(cleanFileName("C:\\Users\\me\\offer.pdf")).toBe("offer.pdf");
    expect(cleanFileName("../../etc/passwd")).toBe("passwd");
    expect(cleanFileName("bad\u0000name.pdf")).toBe("badname.pdf");
    expect(cleanFileName("   ")).toBe("document");
  });
});
