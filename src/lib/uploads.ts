import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Uploads live outside the bundle; the ignore comments stop Turbopack from tracing the whole project.
export const UPLOAD_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads"),
);

const ALLOWED: Record<string, { ext: string; matches: (b: Uint8Array) => boolean }> = {
  "application/pdf": { ext: "pdf", matches: (b) => ascii(b, 0, 4) === "%PDF" },
  "image/png": { ext: "png", matches: (b) => b[0] === 0x89 && ascii(b, 1, 4) === "PNG" },
  "image/jpeg": { ext: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": { ext: "webp", matches: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP" },
};

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

export type StoredFile = { storedName: string; fileName: string; mimeType: string; sizeBytes: number };

/** Validates type (by content, not just the declared MIME type) and size, then writes the file to UPLOAD_DIR. */
export async function storeUpload(file: FormDataEntryValue | null): Promise<StoredFile | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Files must be 5 MB or smaller." };

  const rule = ALLOWED[file.type];
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!rule || !rule.matches(bytes)) return { error: "Upload a PDF, PNG, JPG or WebP file." };

  const storedName = `${randomUUID()}.${rule.ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(resolveStored(storedName), bytes);

  return {
    storedName,
    fileName: path.basename(file.name).slice(0, 200) || `document.${rule.ext}`,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

function resolveStored(storedName: string) {
  const full = path.resolve(/*turbopackIgnore: true*/ UPLOAD_DIR, storedName);
  if (path.dirname(full) !== UPLOAD_DIR) throw new Error("Invalid stored file name");
  return full;
}

export async function readStoredFile(storedName: string) {
  return readFile(resolveStored(storedName));
}

export async function deleteStoredFile(storedName: string) {
  await unlink(resolveStored(storedName)).catch(() => undefined);
}
