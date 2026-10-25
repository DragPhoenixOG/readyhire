"use client";

import { useState, type ReactNode } from "react";
import { buttonClass, cx } from "@/components/ui";

/**
 * Collapsible section built on <details>, used for inline action forms.
 * Open state lives in the client so it survives the refresh after a form submits.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen,
  tone = "secondary",
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <details className="group rounded-lg" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className={cx(buttonClass(tone, "sm"), "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
        {summary}
      </summary>
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">{children}</div>
    </details>
  );
}
