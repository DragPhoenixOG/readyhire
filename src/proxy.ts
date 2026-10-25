import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession, homePathFor, type SessionRole } from "@/lib/session";

const AREA_ROLE: [prefix: string, role: SessionRole][] = [
  ["/admin", "ADMIN"],
  ["/recruiter", "RECRUITER"],
  ["/candidate", "CANDIDATE"],
];

// Optimistic check only: pages and Server Actions re-check the user against the database.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area = AREA_ROLE.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area) return NextResponse.next();

  const session = await decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (session.role !== area[1]) {
    return NextResponse.redirect(new URL(homePathFor(session.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/recruiter/:path*", "/candidate/:path*"],
};
