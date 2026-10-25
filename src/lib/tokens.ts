import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { AuthTokenPurpose } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

const TTL_MINUTES: Record<AuthTokenPurpose, number> = {
  EMAIL_VERIFICATION: 60 * 24,
  PASSWORD_RESET: 60,
};

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Issues a fresh single-use token (replacing unused ones of the same purpose). Only the hash is stored. */
export async function issueAuthToken(userId: string, purpose: AuthTokenPurpose) {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
    db.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + TTL_MINUTES[purpose] * 60 * 1000),
      },
    }),
  ]);
  return token;
}

/** Marks the token used and returns its user id, or null when it is unknown, used or expired. */
export async function consumeAuthToken(token: string, purpose: AuthTokenPurpose) {
  if (!token || token.length > 200) return null;
  const { count } = await db.authToken.updateMany({
    where: { tokenHash: hash(token), purpose, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count === 0) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: hash(token) }, select: { userId: true } });
  return row?.userId ?? null;
}

/** Checks a token without using it up (to decide whether to show the reset form). */
export async function peekAuthToken(token: string, purpose: AuthTokenPurpose) {
  if (!token || token.length > 200) return false;
  const row = await db.authToken.findFirst({
    where: { tokenHash: hash(token), purpose, usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return !!row;
}
