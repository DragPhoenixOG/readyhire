export type UploadTarget = { url: string; method: "PUT"; headers: Record<string, string> };

/** Where verification documents live. Implementations: local disk (dev/test) and any S3-compatible bucket. */
export interface DocumentStore {
  /** A short-lived URL the browser uses to upload exactly `size` bytes of `contentType` to `key`. */
  createUpload(key: string, contentType: string, size: number): Promise<UploadTarget>;
  /** Size of the stored object, or null when it doesn't exist. */
  stat(key: string): Promise<{ size: number } | null>;
  /** The first `length` bytes, used to check the file signature. */
  readHead(key: string, length: number): Promise<Uint8Array>;
  /** A short-lived URL that serves the file inline with the given name. Callers must authorize first. */
  downloadUrl(key: string, fileName: string, contentType: string): Promise<string>;
  /** Stores bytes directly (server-side writes such as seeding). */
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const UPLOAD_URL_TTL_SECONDS = 5 * 60;
export const DOWNLOAD_URL_TTL_SECONDS = 60;

export function contentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
