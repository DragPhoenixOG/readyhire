import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeSession, encodeSession, homePathFor } from "@/lib/session";

beforeAll(() => {
  process.env.AUTH_SECRET = "unit-test-secret-that-is-long-enough-123";
});

describe("session tokens", () => {
  it("round-trips the user, role and session version", async () => {
    const token = await encodeSession({ userId: "u1", role: "RECRUITER", sv: 3 });
    expect(await decodeSession(token)).toEqual({ userId: "u1", role: "RECRUITER", sv: 3 });
  });

  it("rejects tampered, foreign and malformed tokens", async () => {
    const token = await encodeSession({ userId: "u1", role: "CANDIDATE", sv: 0 });
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ userId: "u1", role: "ADMIN", sv: 0 })).toString("base64url");
    expect(await decodeSession(`${header}.${forgedPayload}.${signature}`)).toBeNull();

    const foreign = await new SignJWT({ userId: "u1", role: "ADMIN", sv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("some-other-secret"));
    expect(await decodeSession(foreign)).toBeNull();

    expect(await decodeSession("not-a-token")).toBeNull();
    expect(await decodeSession(undefined)).toBeNull();
  });

  it("rejects tokens without a known role or session version", async () => {
    const key = new TextEncoder().encode(process.env.AUTH_SECRET);
    const noVersion = await new SignJWT({ userId: "u1", role: "ADMIN" }).setProtectedHeader({ alg: "HS256" }).sign(key);
    const badRole = await new SignJWT({ userId: "u1", role: "ROOT", sv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .sign(key);
    expect(await decodeSession(noVersion)).toBeNull();
    expect(await decodeSession(badRole)).toBeNull();
  });

  it("maps roles to their home area", () => {
    expect(homePathFor("ADMIN")).toBe("/admin");
    expect(homePathFor("RECRUITER")).toBe("/recruiter");
    expect(homePathFor("CANDIDATE")).toBe("/candidate");
  });
});
