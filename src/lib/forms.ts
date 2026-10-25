import { z } from "zod";
import { MIN_REASON_LENGTH } from "@/lib/constants";
import { parseDateInput } from "@/lib/format";

/** Result returned by every form Server Action and rendered by <ActionForm>. */
export type ActionState = { ok?: boolean; error?: string; message?: string };

export function fail(error: string): ActionState {
  return { ok: false, error };
}

export function done(message?: string): ActionState {
  return { ok: true, message };
}

export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Check the form and try again." };
  }
  return { ok: true, data: result.data };
}

export const zId = z.string({ error: "Missing identifier." }).min(1, "Missing identifier.");

export function zText(label: string, max = 200) {
  return z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`);
}

export function zOptionalText(max = 2000) {
  return z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));
}

/** A free-text explanation that has to be specific enough to be useful to the other side. */
export function zReason(label: string, max = 1000) {
  return z
    .string({ error: `${label} is required.` })
    .trim()
    .min(MIN_REASON_LENGTH, `${label} must be at least ${MIN_REASON_LENGTH} characters so it is useful.`)
    .max(max, `${label} must be at most ${max} characters.`);
}

export function zOptionalNumber(label: string, min: number, max: number) {
  return z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z
      .number({ error: `${label} must be a number.` })
      .min(min, `${label} must be at least ${min}.`)
      .max(max, `${label} must be at most ${max}.`)
      .nullable(),
  );
}

export function zNumber(label: string, min: number, max: number) {
  return z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z
      .number({ error: `${label} is required.` })
      .min(min, `${label} must be at least ${min}.`)
      .max(max, `${label} must be at most ${max}.`),
  );
}

export function zDate(label: string) {
  return z.string({ error: `${label} is required.` }).transform((value, ctx) => {
    const date = parseDateInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: `${label} is required.` });
      return z.NEVER;
    }
    return date;
  });
}

export function zOptionalDate(label: string) {
  return z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      const date = parseDateInput(value);
      if (!date) {
        ctx.addIssue({ code: "custom", message: `${label} is not a valid date.` });
        return z.NEVER;
      }
      return date;
    });
}

export const zEmail = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const zPassword = z
  .string({ error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(100, "Password is too long.");

export const zAcceptTerms = z.literal("on", { error: "You need to accept the terms to continue." });
