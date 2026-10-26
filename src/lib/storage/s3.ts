import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import {
  DOWNLOAD_URL_TTL_SECONDS,
  type DocumentStore,
  UPLOAD_URL_TTL_SECONDS,
  contentDisposition,
} from "@/lib/storage/types";

/** Works with AWS S3, Cloudflare R2, Supabase Storage (S3 protocol), MinIO, etc. */
export function createS3Store(): DocumentStore {
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    // Newer SDKs add a CRC32 checksum to every request. In a pre-signed upload URL that is the checksum of an
    // empty body, so the bucket would reject the real file; only send checksums when the API requires them.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
  });
  const Bucket = env.S3_BUCKET!;

  return {
    async createUpload(key, contentType, size) {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket, Key: key, ContentType: contentType, ContentLength: size }),
        // Signing type and length means the browser can't upload anything else to this URL.
        { expiresIn: UPLOAD_URL_TTL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) },
      );
      return { url, method: "PUT", headers: { "Content-Type": contentType } };
    },

    async stat(key) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return { size: head.ContentLength ?? 0 };
      } catch (error) {
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null;
        throw error;
      }
    },

    async readHead(key, length) {
      const object = await client.send(new GetObjectCommand({ Bucket, Key: key, Range: `bytes=0-${length - 1}` }));
      return object.Body ? new Uint8Array(await object.Body.transformToByteArray()) : new Uint8Array();
    },

    async downloadUrl(key, fileName, contentType) {
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket,
          Key: key,
          ResponseContentType: contentType,
          ResponseContentDisposition: contentDisposition(fileName),
          ResponseCacheControl: "private, no-store",
        }),
        { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
      );
    },

    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },

    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
}
