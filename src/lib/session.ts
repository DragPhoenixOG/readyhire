// Signed session token shared by the proxy (optimistic route checks) and the server (src/lib/auth.ts).
// Kept free of database and Node-only imports so it can run anywhere.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rh_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionRole = "ADMIN" | "RECRUITER" | "CANDIDATE";
/** `sv` must match the user's current sessionVersion, which lets us revoke every session at once. */
export type SessionPayload = { userId: string; role: SessionRole; sv: number };

const ROLES: readonly string[] = ["ADMIN", "RECRUITER", "CANDIDATE"];

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (secret) return new TextEncoder().encode(secret);
  const appEnv = process.env.APP_ENV;
  const relaxed = appEnv === "development" || appEnv === "test" || (!appEnv && process.env.NODE_ENV !== "production");
  if (!relaxed) throw new Error("AUTH_SECRET must be set.");
  return new TextEncoder().encode("readyhire-local-development-secret");
}

export async function encodeSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getKey());
}

export async function decodeSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") return null;
    if (!ROLES.includes(payload.role) || typeof payload.sv !== "number") return null;
    return {
      userId: payload.userId,
      role: payload.role as SessionRole,
      sv: payload.sv,
    };
  } catch {
    return null;
  }
}

export function homePathFor(role: SessionRole) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "RECRUITER":
      return "/recruiter";
    case "CANDIDATE":
      return "/candidate";
  }
}
