import "server-only";
import { createAnthropicClient, requestDraft } from "@/lib/ai/anthropic";
import type { ResponseContext } from "@/lib/ai/context";
import { type Draft, type DraftKind, templateDraft } from "@/lib/ai/drafts";
import { db } from "@/lib/db";
import { aiDriver, env } from "@/lib/env";

export type DraftResult = { ok: true; draft: Draft } | { ok: false; error: string };

let client: ReturnType<typeof createAnthropicClient> | undefined;

/** Drafts a reply with the configured driver and records the call (never its text) in AiRequest. */
export async function draftReply(kind: DraftKind, ctx: ResponseContext, userId: string): Promise<DraftResult> {
  const driver = aiDriver();
  if (driver === "off") return { ok: false, error: "AI drafting isn't turned on." };
  if (driver === "template") return { ok: true, draft: templateDraft(kind, ctx) };

  client ??= createAnthropicClient(env.ANTHROPIC_API_KEY!);
  const attempt = await requestDraft(client, kind, ctx, { model: env.AI_MODEL, effort: env.AI_EFFORT });
  await db.aiRequest.create({
    data: {
      userId,
      purpose: `response-draft:${kind}`,
      model: env.AI_MODEL,
      inputTokens: attempt.inputTokens,
      outputTokens: attempt.outputTokens,
      outcome: attempt.outcome,
    },
  });
  if (attempt.outcome === "ok" && attempt.draft) return { ok: true, draft: attempt.draft };
  if (attempt.outcome !== "ok") console.error(`[ai] draft ${kind} ${attempt.outcome}: ${attempt.detail ?? ""}`);
  return {
    ok: false,
    error:
      attempt.outcome === "refused"
        ? "The AI couldn't draft this one. Please write the reply yourself."
        : "The draft didn't come through. Try again, or write the reply yourself.",
  };
}
