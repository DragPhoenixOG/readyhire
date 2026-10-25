import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-600">
        This page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/" className={buttonClass("primary")}>
        Go home
      </Link>
    </main>
  );
}
