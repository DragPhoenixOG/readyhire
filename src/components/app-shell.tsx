import type { ReactNode } from "react";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { Badge, buttonClass } from "@/components/ui";

export function AppShell({
  user,
  roleLabel,
  root,
  nav,
  banner,
  children,
}: {
  user: { name: string; email: string };
  roleLabel: string;
  root: string;
  nav: NavItem[];
  banner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href={root} />
            <Badge tone="green">{roleLabel}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <form action={logout}>
              <button type="submit" className={buttonClass("secondary", "sm")}>
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto mt-2 max-w-6xl px-2 sm:px-4">
          <NavLinks items={nav} root={root} />
        </div>
      </header>
      {banner && <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">{banner}</div>}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Readyhire — Hire with confirmed availability.
      </footer>
    </div>
  );
}
