import type { Metadata } from "next";
import "./globals.css";

// Every page is per-request: sessions, live data and a fresh CSP nonce (see src/proxy.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Readyhire — Hire with confirmed availability",
    template: "%s · Readyhire",
  },
  description:
    "Verified candidates and predictable joining for GCCs and quick hirers. Every listed candidate's notice period, resignation and offers are verified.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
