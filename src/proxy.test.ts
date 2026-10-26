import { describe, expect, it } from "vitest";
import { storageOrigin } from "@/proxy";

describe("storageOrigin", () => {
  it("is empty for local storage", () => {
    expect(storageOrigin({ STORAGE_DRIVER: "local" })).toBe("");
  });

  it("uses the bucket host name on AWS", () => {
    expect(storageOrigin({ STORAGE_DRIVER: "s3", S3_BUCKET: "docs", S3_REGION: "ap-south-1" })).toBe(
      "https://docs.s3.ap-south-1.amazonaws.com",
    );
  });

  it("puts the bucket in the host name of a custom endpoint unless path-style is forced", () => {
    const r2 = { STORAGE_DRIVER: "s3", S3_BUCKET: "docs", S3_ENDPOINT: "https://acct.r2.cloudflarestorage.com" };
    expect(storageOrigin(r2)).toBe("https://docs.acct.r2.cloudflarestorage.com");
    expect(storageOrigin({ ...r2, S3_FORCE_PATH_STYLE: "true" })).toBe("https://acct.r2.cloudflarestorage.com");
  });
});
