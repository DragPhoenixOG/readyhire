import { z } from "zod";
import { MIN_REASON_LENGTH, REJECTION_CATEGORIES } from "@/lib/constants";
import type { ResponseContext } from "@/lib/ai/context";

export type DraftKind = "accept" | "reject";
export type RejectionCategory = (typeof REJECTION_CATEGORIES)[number];

export type Draft =
  { kind: "accept"; message: string } | { kind: "reject"; category: RejectionCategory; reason: string };

/** Drafts must pass the same checks as a reply typed by hand, so a draft can always be sent as it is. */
export const draftSchemas = {
  accept: z.object({ message: z.string().trim().min(MIN_REASON_LENGTH).max(1000) }),
  reject: z.object({
    category: z.enum(REJECTION_CATEGORIES),
    reason: z.string().trim().min(MIN_REASON_LENGTH).max(1000),
  }),
};

const intersect = (a: string[], b: string[]) => {
  const wanted = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((s) => wanted.has(s.toLowerCase()));
};

const listOf = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** Offline drafts from the same facts the AI would see. Used in development, tests, and when AI is off. */
export function templateDraft(kind: DraftKind, ctx: ResponseContext): Draft {
  const { job, candidate } = ctx;
  const overlap = intersect(candidate.skills, job.skills).slice(0, 3);
  if (kind === "accept") {
    const fit = overlap.length
      ? `Your experience with ${listOf(overlap)} is a good match for what the team needs.`
      : `Your background looks like a good match for what the team needs.`;
    return {
      kind,
      message: `Hi ${candidate.firstName}, thank you for applying for the ${job.title} role at ${job.company}. ${fit} As a next step we'd like to set up a first interview; I'll share times on Readyhire shortly.`,
    };
  }

  const lateBy =
    job.joiningWindowDays != null && candidate.daysUntilAvailable != null
      ? candidate.daysUntilAvailable - job.joiningWindowDays
      : 0;
  const tooJunior = candidate.experienceYears != null && candidate.experienceYears < job.minExperienceYears;
  const greeting = `Hi ${candidate.firstName}, thank you for applying for the ${job.title} role.`;
  if (lateBy > 0) {
    return {
      kind,
      category: "Joining timeline doesn't fit",
      reason: `${greeting} We need someone who can join within ${job.joiningWindowDays} days, and your verified joining date is ${candidate.daysUntilAvailable} days away, so we can't take your application forward for this opening.`,
    };
  }
  if (tooJunior) {
    return {
      kind,
      category: "Experience level doesn't match",
      reason: `${greeting} This role needs ${job.experience} of experience, and with ${candidate.experienceYears} years we don't think it's the right level for you yet.`,
    };
  }
  const missing = job.skills.filter((skill) => !intersect([skill], candidate.skills).length).slice(0, 3);
  if (missing.length) {
    return {
      kind,
      category: "Skills don't match the role",
      reason: `${greeting} The role needs hands-on ${listOf(missing)}, which we didn't see in your profile, so we won't be moving forward this time.`,
    };
  }
  return {
    kind,
    category: "Other",
    reason: `${greeting} We've decided to move forward with candidates whose experience is closer to what this team needs right now.`,
  };
}
