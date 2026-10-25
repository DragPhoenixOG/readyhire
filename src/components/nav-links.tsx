"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export type NavItem = { href: string; label: string; count?: number };

export function NavLinks({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Main">
      {items.map((item) => {
        const active = item.href === root ? pathname === root : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
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
