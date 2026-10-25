import "server-only";
import { db } from "@/lib/db";

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

/**
 * Fixed-window counter stored in Postgres, so limits hold across serverless instances.
 * One atomic upsert per call; windows reset lazily.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowSeconds * 1000);
  const [row] = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart"`;
  const resetAt = row.windowStart.getTime() + windowSeconds * 1000;
  return {
    ok: row.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
}

export function retryMessage(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

/** Old windows are harmless but accumulate; the reminder cron prunes them. */
export async function pruneRateLimits(olderThanSeconds = 24 * 60 * 60) {
  await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - olderThanSeconds * 1000) } } });
}
