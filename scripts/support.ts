// Helpers for command-line scripts (seed, create-admin). These run outside Next.js, so they read
// configuration straight from the environment instead of src/lib/env.ts.
import "dotenv/config";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

export function createScriptClient() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set DATABASE_URL (see .env.example).");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export function appEnv() {
  if (process.env.APP_ENV) return process.env.APP_ENV;
  if (process.env.VERCEL_ENV === "production") return "production";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

/** Writes and deletes stored documents with whichever driver STORAGE_DRIVER selects. */
export function createScriptStore() {
  if (process.env.STORAGE_DRIVER === "s3") {
    const client = new S3Client({
      region: process.env.S3_REGION ?? "ap-south-1",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      // Newer SDKs add a CRC32 checksum to every request. In a pre-signed upload URL that is the checksum of an
      // empty body, so the bucket would reject the real file; only send checksums when the API requires them.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    const Bucket = process.env.S3_BUCKET!;
    return {
      put: (key: string, body: Uint8Array, contentType: string) =>
        client
          .send(
            new PutObjectCommand({
              Bucket,
              Key: key,
              Body: body,
              ContentType: contentType,
            }),
          )
          .then(() => undefined),
      remove: (key: string) => client.send(new DeleteObjectCommand({ Bucket, Key: key })).then(() => undefined),
    };
  }
  const root = path.resolve(process.env.LOCAL_STORAGE_DIR ?? "./storage");
  return {
    async put(key: string, body: Uint8Array) {
      const file = path.join(root, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
    },
    remove: (key: string) => unlink(path.join(root, key)).catch(() => undefined),
  };
}
