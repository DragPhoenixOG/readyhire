import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, decodeSession, encodeSession, homePathFor } from "@/lib/session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** A hash to compare against when the email is unknown, so response time doesn't reveal which emails exist. */
const DUMMY_HASH = "$2b$12$uyUu20nhY/DtzKulm2ZSzex8EGQJaxX6.y/e58vSIEPW5MJ9PiEui";
export async function verifyPasswordOrDummy(password: string, hash: string | undefined) {
  return bcrypt.compare(password, hash ?? DUMMY_HASH).then((ok) => ok && !!hash);
}

export async function startSession(user: { id: string; role: Role; sessionVersion: number }) {
  const token = await encodeSession({
    userId: user.id,
    role: user.role,
    sv: user.sessionVersion,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

const getSession = cache(async () => decodeSession((await cookies()).get(SESSION_COOKIE)?.value));

/**
 * The signed-in user, re-read from the database on every request so that restrictions,
 * role changes and revoked sessions (password change, "sign out everywhere") apply immediately.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      flagged: true,
      emailVerifiedAt: true,
      sessionVersion: true,
    },
  });
  if (!user || user.status === "RESTRICTED" || user.role !== session.role || user.sessionVersion !== session.sv) {
    return null;
  }
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Signed-in user regardless of email verification (for the verify-email page). */
export async function requireSignedIn(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireSignedIn();
  if (!user.emailVerifiedAt) redirect("/verify-email");
  if (user.role !== role) redirect(homePathFor(user.role));
  return user;
}

export const requireCandidate = cache(async () => {
  const user = await requireRole("CANDIDATE");
  const profile = await db.candidateProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) redirect("/login");
  return { user, profile };
});

export const requireRecruiter = cache(async () => {
  const user = await requireRole("RECRUITER");
  const recruiter = await db.recruiterProfile.findUnique({
    where: { userId: user.id },
    include: { company: true },
  });
  if (!recruiter) redirect("/login");
  return { user, recruiter };
});

/** Recruiter features (jobs, talent pool, applications) need admin approval first. */
export async function requireApprovedRecruiter() {
  const ctx = await requireRecruiter();
  if (ctx.recruiter.approvalStatus !== "APPROVED") redirect("/recruiter");
  return ctx;
}

/** Sends signed-in users from the login and sign-up pages to their dashboard. */
export async function redirectIfSignedIn() {
  const user = await getCurrentUser();
  if (!user) return;
  redirect(user.emailVerifiedAt ? homePathFor(user.role) : "/verify-email");
}
