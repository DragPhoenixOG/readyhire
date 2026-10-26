import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession, homePathFor, type SessionRole } from "@/lib/session";

const AREA_ROLE: [prefix: string, role: SessionRole][] = [
  ["/admin", "ADMIN"],
  ["/recruiter", "RECRUITER"],
  ["/candidate", "CANDIDATE"],
];

/** Origin of the document bucket, which the browser talks to directly for uploads and previews. */
export function storageOrigin(vars: Record<string, string | undefined> = process.env) {
  if (vars.STORAGE_DRIVER !== "s3") return "";
  const pathStyle = vars.S3_FORCE_PATH_STYLE === "true";
  if (vars.S3_ENDPOINT) {
    // Without path-style addressing the SDK puts the bucket in the host name, as it does for AWS.
    const endpoint = new URL(vars.S3_ENDPOINT);
    return pathStyle ? endpoint.origin : `${endpoint.protocol}//${vars.S3_BUCKET}.${endpoint.host}`;
  }
  const region = vars.S3_REGION || "ap-south-1";
  return pathStyle ? `https://s3.${region}.amazonaws.com` : `https://${vars.S3_BUCKET}.s3.${region}.amazonaws.com`;
}

function securityHeaders(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  const https = (process.env.APP_URL ?? "").startsWith("https://");
  const storage = storageOrigin();
  const csp = [
    "default-src 'self'",
    // React needs eval only in development for better stack traces.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' blob: data: ${storage}`,
    "font-src 'self'",
    `connect-src 'self' ${storage}${dev ? " ws:" : ""}`,
    `frame-src 'self' ${storage}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ]
    .map((d) => d.trim())
    .join("; ");

  return {
    "Content-Security-Policy": csp,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    ...(https
      ? {
          "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
        }
      : {}),
  };
}

function withHeaders(response: NextResponse, headers: Record<string, string>) {
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const headers = securityHeaders(nonce);
  const { pathname } = request.nextUrl;

  // Optimistic role check only: pages and Server Actions re-check the user against the database.
  const area = AREA_ROLE.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (area) {
    const session = await decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return withHeaders(NextResponse.redirect(url), headers);
    }
    if (session.role !== area[1]) {
      return withHeaders(NextResponse.redirect(new URL(homePathFor(session.role), request.url)), headers);
    }
  }

  // Next.js reads the nonce from the request's CSP header and adds it to its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", headers["Content-Security-Policy"]);
  return withHeaders(NextResponse.next({ request: { headers: requestHeaders } }), headers);
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|api/storage|favicon.ico|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
