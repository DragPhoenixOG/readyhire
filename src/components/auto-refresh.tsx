"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps signed-in pages current (recruiter responses, interviews, verification decisions)
 * by re-fetching server data periodically and whenever the tab regains focus.
 * Skips a refresh while the user is typing so form input is never disturbed.
 */
export function AutoRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const editing = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
    };
    const refresh = () => {
      if (document.visibilityState === "visible" && !editing()) router.refresh();
    };

    const timer = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
