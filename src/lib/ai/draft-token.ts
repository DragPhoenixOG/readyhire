import "server-only";
import { createHash } from "node:crypto";
import type { DraftKind } from "@/lib/ai/drafts";
import { signPayload, verifyPayload } from "@/lib/signing";

const PURPOSE = "response-draft";
const TTL_SECONDS = 60 * 60;

type DraftToken = { applicationId: string; kind: DraftKind; hash: string };

/** Whitespace-insensitive fingerprint, so re-wrapping a line doesn't count as editing the draft. */
function fingerprint(text: string) {
  return createHash("sha256").update(text.trim().replace(/\s+/g, " ")).digest("hex");
}

/** Issued with a draft; ties it to one application and to the exact text suggested. */
export function issueDraftToken(applicationId: string, kind: DraftKind, text: string) {
  return signPayload(PURPOSE, { applicationId, kind, hash: fingerprint(text) } satisfies DraftToken, TTL_SECONDS);
}

/**
 * Whether the reply being sent started from a draft, and whether it's unchanged. A missing, forged or expired token
 * just means "not assisted": it can't affect the reply itself.
 */
export async function draftFlags(
  token: FormDataEntryValue | null,
  applicationId: string,
  kind: DraftKind,
  sent: string,
) {
  const payload = typeof token === "string" && token ? await verifyPayload<DraftToken>(PURPOSE, token) : null;
  if (!payload || payload.applicationId !== applicationId || payload.kind !== kind) {
    return { responseDraftUsed: false, responseDraftUnedited: false };
  }
  return { responseDraftUsed: true, responseDraftUnedited: payload.hash === fingerprint(sent) };
}
