"use server";

import { z } from "zod";
import { buildResponseContext } from "@/lib/ai/context";
import type { RejectionCategory } from "@/lib/ai/drafts";
import { issueDraftToken } from "@/lib/ai/draft-token";
import { draftReply } from "@/lib/ai";
import { requireApprovedRecruiter } from "@/lib/auth";
import { candidateSummaryInclude, summarizeCandidate } from "@/lib/candidate";
import { db } from "@/lib/db";
import { rateLimit, retryMessage } from "@/lib/rate-limit";

const DRAFTS_PER_HOUR = 30;

export type DraftReplyResult =
  { ok: true; text: string; category?: RejectionCategory; token: string } | { ok: false; error: string };

const input = z.object({ applicationId: z.string().min(1).max(50), kind: z.enum(["accept", "reject"]) });

/**
 * Suggests an accept message or a reject reason for an application waiting for a reply. It never changes the
 * application: only the recruiter's own accept/reject submission counts as the reply.
 */
export async function draftApplicationReply(raw: z.input<typeof input>): Promise<DraftReplyResult> {
  const { user, recruiter } = await requireApprovedRecruiter();
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { applicationId, kind } = parsed.data;

  const application = await db.application.findFirst({
    where: { id: applicationId, job: { recruiterId: recruiter.id } },
    include: { job: { include: { company: true } }, candidate: { include: candidateSummaryInclude } },
  });
  if (!application) return { ok: false, error: "Application not found." };
  if (application.status !== "APPLIED") return { ok: false, error: "You've already replied to this application." };

  const limit = await rateLimit(`ai-draft:${user.id}`, DRAFTS_PER_HOUR, 60 * 60);
  if (!limit.ok) return { ok: false, error: retryMessage(limit.retryAfterSeconds) };

  const context = buildResponseContext({
    coverNote: application.coverNote,
    job: application.job,
    candidate: application.candidate,
    summary: summarizeCandidate(application.candidate),
  });
  const result = await draftReply(kind, context, user.id);
  if (!result.ok) return result;

  const text = result.draft.kind === "accept" ? result.draft.message : result.draft.reason;
  return {
    ok: true,
    text,
    category: result.draft.kind === "reject" ? result.draft.category : undefined,
    token: await issueDraftToken(applicationId, kind, text),
  };
}
