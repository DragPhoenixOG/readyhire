import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. On Vercel and most managed hosts the platform sets
 * x-forwarded-for; behind your own proxy, make sure it overwrites (not appends to) that header.
 */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
