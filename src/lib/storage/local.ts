import "server-only";
import { mkdir, open, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { signPayload } from "@/lib/signing";
import { DOWNLOAD_URL_TTL_SECONDS, type DocumentStore, UPLOAD_URL_TTL_SECONDS } from "@/lib/storage/types";

export const LOCAL_LINK_PURPOSE = "local-storage";

export type LocalLink =
  | { op: "put"; key: string; contentType: string; size: number }
  | { op: "get"; key: string; contentType: string; fileName: string };

export function localRoot() {
  // The ignore comment stops Turbopack from tracing the whole project for this runtime path.
  return path.resolve(/*turbopackIgnore: true*/ env.LOCAL_STORAGE_DIR);
}

/** Resolves a storage key to a path, refusing anything that escapes the storage folder. */
export function localPath(key: string) {
  const root = localRoot();
  const full = path.resolve(/*turbopackIgnore: true*/ root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

/** Development/test store on local disk; uploads and downloads go through /api/storage/local with signed links. */
export function createLocalStore(): DocumentStore {
  const link = async (payload: LocalLink, ttl: number) =>
    `/api/storage/local?token=${await signPayload(LOCAL_LINK_PURPOSE, payload, ttl)}`;

  return {
    async createUpload(key, contentType, size) {
      return {
        url: await link({ op: "put", key, contentType, size }, UPLOAD_URL_TTL_SECONDS),
        method: "PUT",
        headers: { "Content-Type": contentType },
      };
    },

    async stat(key) {
      try {
        return { size: (await stat(localPath(key))).size };
      } catch {
        return null;
      }
    },

    async readHead(key, length) {
      const handle = await open(localPath(key), "r");
      try {
        const buffer = new Uint8Array(length);
        const { bytesRead } = await handle.read(buffer, 0, length, 0);
        return buffer.slice(0, bytesRead);
      } finally {
        await handle.close();
      }
    },

    async downloadUrl(key, fileName, contentType) {
      return link({ op: "get", key, contentType, fileName }, DOWNLOAD_URL_TTL_SECONDS);
    },

    async put(key, body) {
      const file = localPath(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
    },

    async remove(key) {
      await unlink(localPath(key)).catch(() => undefined);
    },
  };
}

export async function readLocalFile(key: string) {
  return readFile(localPath(key));
}
