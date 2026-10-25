"use client";

import { useActionState, useEffect, useRef, useState, startTransition, type FormEvent, type ReactNode } from "react";
import { buttonClass, cx } from "@/components/ui";
import type { ActionState } from "@/lib/forms";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  /** Ask for confirmation before submitting. */
  confirm?: string;
  resetOnSuccess?: boolean;
  className?: string;
  /** Extra buttons rendered next to the submit button. */
  extraActions?: ReactNode;
};

/**
 * Form wrapper for Server Actions that keeps the user's input when validation fails
 * (React otherwise resets uncontrolled fields after every action) and shows the result.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant = "primary",
  size = "md",
  confirm,
  resetOnSuccess,
  className,
  extraActions,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  // Hide the last result once the user starts editing again, and show each new result.
  const [shownState, setShownState] = useState(state);
  const [dismissed, setDismissed] = useState(false);
  if (state !== shownState) {
    setShownState(state);
    setDismissed(false);
  }

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} onChange={() => setDismissed(true)} className={cx("space-y-4", className)}>
      {children}
      {!dismissed && state.error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {state.error}
        </p>
      )}
      {!dismissed && state.ok && state.message && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className={buttonClass(variant, size)}>
          {pending ? (pendingLabel ?? "Saving…") : submitLabel}
        </button>
        {extraActions}
      </div>
    </form>
  );
}
