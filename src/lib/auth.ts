import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  decodeSession,
  encodeSession,
  homePathFor,
} from "@/lib/session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function startSession(userId: string, role: Role) {
  const token = await encodeSession({ userId, role });
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
 * The signed-in user, re-read from the database on every request so that
 * restrictions and role changes take effect immediately.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, status: true, flagged: true },
  });
  if (!user || user.status === "RESTRICTED" || user.role !== session.role) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(homePathFor(user.role));
  return user;
}

export const requireCandidate = cache(async () => {
  const user = await requireRole("CANDIDATE");
  const profile = await db.candidateProfile.findUnique({ where: { userId: user.id } });
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
  if (user) redirect(homePathFor(user.role));
}
