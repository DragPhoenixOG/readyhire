"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import {
  endSession,
  getCurrentUser,
  hashPassword,
  requireSignedIn,
  startSession,
  verifyPassword,
  verifyPasswordOrDummy,
} from "@/lib/auth";
import { CITIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { checkRecruiterDomain } from "@/lib/domain";
import { emails } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/transport";
import {
  type ActionState,
  done,
  fail,
  parseForm,
  zAcceptTerms,
  zEmail,
  zOptionalText,
  zPassword,
  zText,
} from "@/lib/forms";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { homePathFor } from "@/lib/session";
import { consumeAuthToken, issueAuthToken } from "@/lib/tokens";

// ───────────────────────── Sign in / out ─────────────────────────

const loginSchema = z.object({
  email: zEmail,
  password: z.string({ error: "Password is required." }).min(1, "Password is required."),
  next: z.string().optional(),
});

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { email, password, next } = parsed.data;

  // Per-IP limit stops password spraying; per-account limit stops guessing one password.
  const ip = await clientIp();
  const limits = [await rateLimit(`login:ip:${ip}`, 30, 15 * 60), await rateLimit(`login:email:${email}`, 8, 15 * 60)];
  const blocked = limits.find((l) => !l.ok);
  if (blocked) return fail(retryMessage(blocked.retryAfterSeconds));

  const user = await db.user.findUnique({ where: { email } });
  const passwordOk = await verifyPasswordOrDummy(password, user?.passwordHash);
  if (!user || !passwordOk) return fail("That email and password combination doesn't match an account.");
  if (user.status === "RESTRICTED") {
    return fail(
      `This account has been restricted${user.restrictedReason ? `: ${user.restrictedReason}` : ""}. Contact support@readyhire.in.`,
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await startSession(user);
  if (!user.emailVerifiedAt) redirect("/verify-email");
  const home = homePathFor(user.role);
  // Only follow `next` when it stays inside the user's own area.
  redirect(next && (next === home || next.startsWith(`${home}/`)) ? next : home);
}

export async function logout() {
  await endSession();
  redirect("/");
}

/** Invalidates every session of the current user, including this one. */
export async function signOutEverywhere() {
  const user = await requireSignedIn();
  await db.user.update({
    where: { id: user.id },
    data: { sessionVersion: { increment: 1 } },
  });
  await audit(user.id, "SIGNED_OUT_EVERYWHERE", "User", user.id, "All sessions revoked");
  await endSession();
  redirect("/login");
}

// ───────────────────────── Sign up ─────────────────────────

async function signupThrottled(): Promise<string | null> {
  const limit = await rateLimit(`signup:ip:${await clientIp()}`, 10, 60 * 60);
  return limit.ok ? null : retryMessage(limit.retryAfterSeconds);
}

async function sendVerification(user: { id: string; name: string; email: string }) {
  const token = await issueAuthToken(user.id, "EMAIL_VERIFICATION");
  after(() => sendEmail({ to: user.email, ...emails.verifyEmail(user.name, token) }));
}

const candidateSignupSchema = z.object({
  name: zText("Full name", 100),
  email: zEmail,
  password: zPassword,
  phone: zOptionalText(20),
  city: z.enum(CITIES, { error: "Choose your city." }),
  terms: zAcceptTerms,
});

export async function signupCandidate(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(candidateSignupSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { name, email, password, phone, city } = parsed.data;

  const throttled = await signupThrottled();
  if (throttled) return fail(throttled);
  if (await db.user.findUnique({ where: { email } })) {
    return fail("An account with this email already exists. Sign in or reset your password.");
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "CANDIDATE",
      termsAcceptedAt: new Date(),
      candidate: { create: { phone, city } },
    },
  });

  await sendVerification(user);
  await startSession(user);
  redirect("/verify-email");
}

const recruiterSignupSchema = z.object({
  name: zText("Full name", 100),
  email: zEmail,
  password: zPassword,
  companyName: zText("Company name", 120),
  website: zOptionalText(200),
  title: zOptionalText(100),
  phone: zOptionalText(20),
  terms: zAcceptTerms,
});

export async function signupRecruiter(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(recruiterSignupSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { name, email, password, companyName, website, title, phone } = parsed.data;

  const domainError = checkRecruiterDomain(email, website);
  if (domainError) return fail(domainError);
  const throttled = await signupThrottled();
  if (throttled) return fail(throttled);
  if (await db.user.findUnique({ where: { email } })) {
    return fail("An account with this email already exists. Sign in or reset your password.");
  }

  const domain = email.split("@")[1];
  // Recruiters from the same domain share one company record.
  const company = await db.company.upsert({
    where: { domain },
    update: {},
    create: { name: companyName, domain, website },
  });

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "RECRUITER",
      termsAcceptedAt: new Date(),
      recruiter: { create: { companyId: company.id, title, phone } },
    },
  });

  // Confirming the inbox is what proves the recruiter controls an address on the company domain.
  await sendVerification(user);
  await startSession(user);
  redirect("/verify-email");
}

// ───────────────────────── Email verification ─────────────────────────

export async function resendVerification(): Promise<ActionState> {
  const user = await requireSignedIn();
  if (user.emailVerifiedAt) redirect(homePathFor(user.role));
  const limit = await rateLimit(`verify-email:${user.id}`, 5, 60 * 60);
  if (!limit.ok) return fail(retryMessage(limit.retryAfterSeconds));
  await sendVerification(user);
  return done(`We sent a new link to ${user.email}.`);
}

export async function confirmEmail(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await consumeAuthToken(String(formData.get("token") ?? ""), "EMAIL_VERIFICATION");
  if (!userId) return fail("This link has expired or was already used. Sign in to get a new one.");

  const user = await db.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
  await audit(user.id, "EMAIL_VERIFIED", "User", user.id, user.email);

  // Sign in the inbox owner, unless a different account is signed in on this browser.
  const current = await getCurrentUser();
  if (current && current.id !== user.id) {
    return done("Email confirmed. Sign out and sign in with that account to continue.");
  }
  if (!current) await startSession(user);
  redirect(homePathFor(user.role));
}

// ───────────────────────── Passwords ─────────────────────────

export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ email: zEmail }), formData);
  if (!parsed.ok) return fail(parsed.error);
  const { email } = parsed.data;

  const ip = await clientIp();
  const limits = [await rateLimit(`reset:ip:${ip}`, 10, 60 * 60), await rateLimit(`reset:email:${email}`, 3, 60 * 60)];
  const blocked = limits.find((l) => !l.ok);
  if (blocked) return fail(retryMessage(blocked.retryAfterSeconds));

  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE") {
    const token = await issueAuthToken(user.id, "PASSWORD_RESET");
    after(() => sendEmail({ to: user.email, ...emails.passwordReset(user.name, token) }));
  }
  // Same answer either way, so this form can't be used to discover accounts.
  return done(`If an account exists for ${email}, we've emailed a link to reset the password.`);
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: zPassword,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "The passwords don't match.",
  });

export async function resetPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(resetSchema, formData);
  if (!parsed.ok) return fail(parsed.error);

  const userId = await consumeAuthToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) return fail("This reset link has expired or was already used. Request a new one.");

  const existing = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const user = await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      // Revokes every existing session. Following the emailed link also proves the inbox.
      sessionVersion: { increment: 1 },
      emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
    },
  });
  await audit(user.id, "PASSWORD_RESET", "User", user.id, "Password reset by email link");

  if (user.status !== "ACTIVE") return done("Password updated.");
  await startSession(user);
  redirect(homePathFor(user.role));
}

const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    password: zPassword,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "The new passwords don't match.",
  });

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const sessionUser = await requireSignedIn();
  const parsed = parseForm(changePasswordSchema, formData);
  if (!parsed.ok) return fail(parsed.error);

  const limit = await rateLimit(`change-password:${sessionUser.id}`, 5, 15 * 60);
  if (!limit.ok) return fail(retryMessage(limit.retryAfterSeconds));

  const user = await db.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });
  if (!(await verifyPassword(parsed.data.current, user.passwordHash)))
    return fail("Your current password is incorrect.");

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      sessionVersion: { increment: 1 },
    },
  });
  await audit(user.id, "PASSWORD_CHANGED", "User", user.id, "Password changed; other sessions signed out");
  // Keep this browser signed in with the new session version; every other session ends.
  await startSession(updated);
  return done("Password changed. You've been signed out on other devices.");
}
