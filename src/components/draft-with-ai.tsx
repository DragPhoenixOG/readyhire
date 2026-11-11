"use client";

import { useRef, useState } from "react";
import { draftApplicationReply } from "@/actions/assist";
import { buttonClass } from "@/components/ui";

/**
 * "Draft with AI" for a reply form: fills the form's text field (and the rejection category) with a suggestion the
 * recruiter then edits. Sends the signed draft token with the form so the reply can be marked as assisted.
 */
export function DraftWithAi({
  applicationId,
  kind,
  field,
  categoryField,
}: {
  applicationId: string;
  kind: "accept" | "reject";
  /** Name of the textarea to fill. */
  field: string;
  /** Name of the category select (rejections only). */
  categoryField?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "drafting" | "drafted">("idle");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");

  async function draft() {
    setState("drafting");
    setError(null);
    try {
      const result = await draftApplicationReply({ applicationId, kind });
      if (!result.ok) {
        setError(result.error);
        setState(token ? "drafted" : "idle");
        return;
      }
      const form = ref.current?.closest("form");
      const text = form?.elements.namedItem(field);
      if (text instanceof HTMLTextAreaElement) {
        text.value = result.text;
        text.focus();
      }
      const category = categoryField ? form?.elements.namedItem(categoryField) : null;
      if (category instanceof HTMLSelectElement && result.category) category.value = result.category;
      setToken(result.token);
      setState("drafted");
    } catch {
      setError("The draft didn't come through. Try again, or write the reply yourself.");
      setState(token ? "drafted" : "idle");
    }
  }

  return (
    <div ref={ref} className="space-y-2">
      <input type="hidden" name="draftToken" value={token} />
      <button type="button" onClick={draft} disabled={state === "drafting"} className={buttonClass("secondary", "sm")}>
        {state === "drafting" ? "Drafting…" : state === "drafted" ? "Draft again" : "Draft with AI"}
      </button>
      {state === "drafted" && (
        <p className="text-xs text-slate-500">
          AI draft. Review it before sending; only what you send counts as your reply.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
    </div>
  );
}
