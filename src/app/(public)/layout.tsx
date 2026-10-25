import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { homePathFor } from "@/lib/session";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href={homePathFor(user.role)} className={buttonClass("primary", "sm")}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClass("ghost", "sm")}>
                  Sign in
                </Link>
                <Link href="/signup" className={buttonClass("primary", "sm")}>
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-slate-500 sm:px-6">
          <p>Readyhire — Hire with confirmed availability.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-800">
              Terms &amp; platform rules
            </Link>
            <Link href="/privacy" className="hover:text-slate-800">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
