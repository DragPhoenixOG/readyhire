"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui";

export type NavItem = { href: string; label: string; count?: number };

export function NavLinks({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  // Where a link click is taking us, so the matching tab is highlighted while that page loads. Any link counts
  // (the logo, Account, "View application"…), not only these tabs. Cleared as soon as the URL changes.
  const [target, setTarget] = useState<string | null>(null);
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (seenPathname !== pathname) {
    setSeenPathname(pathname);
    setTarget(null);
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin === window.location.origin && url.pathname !== window.location.pathname) setTarget(url.pathname);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const matches = (href: string, path: string) => (href === root ? path === root : path.startsWith(href));
  const shown = target ?? pathname;
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Main">
      {items.map((item) => {
        const active = matches(item.href, shown);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={matches(item.href, pathname) ? "page" : undefined}
            className={cx(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-brand-700 text-brand-800"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
            )}
          >
            {item.label}
            {!!item.count && (
              <span className="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
