import "server-only";
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z
  .object({
    /** development | test | staging | production. Production turns on the strict checks below. */
    APP_ENV: z.enum(["development", "test", "staging", "production"]),
    /** Public base URL, used in emails and security headers. */
    APP_URL: z.url().default("http://localhost:3000"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(5),

    AUTH_SECRET: z.string().optional(),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().default("./storage"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("ap-south-1"),
    S3_ENDPOINT: z.url().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: bool,

    EMAIL_DRIVER: z.enum(["console", "resend", "smtp"]).default("console"),
    EMAIL_FROM: z.string().default("Readyhire <no-reply@readyhire.local>"),
    RESEND_API_KEY: z.string().optional(),
    SMTP_URL: z.string().optional(),
    /** Console driver only: also append emails to this file (used by end-to-end tests). */
    EMAIL_OUTBOX_FILE: z.string().optional(),

    /** Bearer token that scheduled jobs (Vercel Cron) must send. */
    CRON_SECRET: z.string().optional(),
    SHOW_DEMO_ACCOUNTS: bool,
  })
  .superRefine((env, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    if (env.STORAGE_DRIVER === "s3") {
      if (!env.S3_BUCKET) issue("S3_BUCKET", "is required when STORAGE_DRIVER=s3");
      if (!env.S3_ACCESS_KEY_ID) issue("S3_ACCESS_KEY_ID", "is required when STORAGE_DRIVER=s3");
      if (!env.S3_SECRET_ACCESS_KEY) issue("S3_SECRET_ACCESS_KEY", "is required when STORAGE_DRIVER=s3");
    }
    if (env.EMAIL_DRIVER === "resend" && !env.RESEND_API_KEY)
      issue("RESEND_API_KEY", "is required when EMAIL_DRIVER=resend");
    if (env.EMAIL_DRIVER === "smtp" && !env.SMTP_URL) issue("SMTP_URL", "is required when EMAIL_DRIVER=smtp");

    if (env.APP_ENV === "production" || env.APP_ENV === "staging") {
      if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) issue("AUTH_SECRET", "must be at least 32 characters");
      if (env.STORAGE_DRIVER !== "s3") issue("STORAGE_DRIVER", "must be s3 outside development and tests");
      if (env.EMAIL_DRIVER === "console") issue("EMAIL_DRIVER", "must be resend or smtp outside development and tests");
      if (!env.CRON_SECRET) issue("CRON_SECRET", "is required so reminder jobs can authenticate");
      if (!env.APP_URL.startsWith("https://")) issue("APP_URL", "must use https");
    }
  });

export type Env = z.infer<typeof schema>;

function defaultAppEnv() {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "staging";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

let cached: Env | undefined;

/** Parsed lazily so `next build` doesn't need runtime secrets. Throws a readable error on bad config. */
export function getEnv(): Env {
  if (cached) return cached;
  // Treat empty variables (common in .env files and dashboards) as unset.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));
  const result = schema.safeParse({
    ...raw,
    APP_ENV: raw.APP_ENV ?? defaultAppEnv(),
  });
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid Readyhire configuration:\n${problems}\nSee .env.example.`);
  }
  cached = result.data;
  return cached;
}

export const env = new Proxy({} as Env, {
  get: (_target, key) => getEnv()[key as keyof Env],
});

export const isProductionLike = () => env.APP_ENV === "production" || env.APP_ENV === "staging";
