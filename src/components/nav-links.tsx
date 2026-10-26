"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/components/ui";

export type NavItem = { href: string; label: string; count?: number };

export function NavLinks({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  // The link just clicked, highlighted while its page loads. It only counts until the URL changes.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null);
  const pending = clicked?.from === pathname ? clicked.href : null;
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Main">
      {items.map((item) => {
        const current = item.href === root ? pathname === root : pathname.startsWith(item.href);
        const active = pending ? pending === item.href : current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            onClick={(e) => {
              const newTab = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
              if (!newTab && !current) setClicked({ href: item.href, from: pathname });
            }}
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
