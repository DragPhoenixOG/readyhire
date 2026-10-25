"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { CITIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { checkRecruiterDomain } from "@/lib/domain";
import {
  type ActionState,
  fail,
  parseForm,
  zAcceptTerms,
  zEmail,
  zOptionalText,
  zPassword,
  zText,
} from "@/lib/forms";
import { homePathFor } from "@/lib/session";

const loginSchema = z.object({
  email: zEmail,
  password: z.string({ error: "Password is required." }).min(1, "Password is required."),
  next: z.string().optional(),
});

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return fail(parsed.error);
  const { email, password, next } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail("That email and password combination doesn't match an account.");
  }
  if (user.status === "RESTRICTED") {
    return fail(
      `This account has been restricted${user.restrictedReason ? `: ${user.restrictedReason}` : ""}. Contact support@readyhire.in.`,
    );
  }

  await startSession(user.id, user.role);
  const home = homePathFor(user.role);
  // Only follow `next` when it stays inside the user's own area.
  redirect(next && (next === home || next.startsWith(`${home}/`)) ? next : home);
}

export async function logout() {
  await endSession();
  redirect("/");
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

  if (await db.user.findUnique({ where: { email } })) {
    return fail("An account with this email already exists. Sign in instead.");
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

  await startSession(user.id, user.role);
  redirect("/candidate");
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

  if (await db.user.findUnique({ where: { email } })) {
    return fail("An account with this email already exists. Sign in instead.");
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

  await startSession(user.id, user.role);
  redirect("/recruiter");
}
