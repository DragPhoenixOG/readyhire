import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

function key(purpose: string) {
  // Separate key per purpose so a token minted for one use can't be replayed for another.
  const secret = env.AUTH_SECRET ?? "readyhire-local-development-secret";
  return new TextEncoder().encode(`${secret}:${purpose}`);
}

/** Short-lived signed payload (upload tickets, local storage links). */
export async function signPayload(purpose: string, payload: Record<string, unknown>, ttlSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key(purpose));
}

export async function verifyPayload<T>(purpose: string, token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, key(purpose), {
      algorithms: ["HS256"],
    });
    return payload as T;
  } catch {
    return null;
  }
}
