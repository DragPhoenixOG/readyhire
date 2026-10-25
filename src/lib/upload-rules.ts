// Upload rules shared by the browser (early feedback) and the server (enforcement).

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Resumes are shared with recruiters, so they're PDF only: one format that opens the same everywhere. */
export const RESUME_UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
};

export type UploadKind = "document" | "resume";

export function allowedUploadTypes(kind: UploadKind = "document") {
  return kind === "resume" ? RESUME_UPLOAD_TYPES : ALLOWED_UPLOAD_TYPES;
}

export function uploadAccept(kind: UploadKind = "document") {
  return Object.keys(allowedUploadTypes(kind)).join(",");
}

export function uploadProblem(contentType: string, size: number, kind: UploadKind = "document"): string | null {
  if (!(contentType in allowedUploadTypes(kind)))
    return kind === "resume" ? "Upload your resume as a PDF." : "Upload a PDF, PNG, JPG or WebP file.";
  if (size <= 0) return "That file is empty.";
  if (size > MAX_UPLOAD_BYTES) return "Files must be 5 MB or smaller.";
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

/** Checks the file's magic bytes so a renamed file can't pass as a PDF or image. */
export function matchesSignature(contentType: string, head: Uint8Array) {
  switch (contentType) {
    case "application/pdf":
      return ascii(head, 0, 5) === "%PDF-";
    case "image/png":
      return head[0] === 0x89 && ascii(head, 1, 4) === "PNG";
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/webp":
      return ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP";
    default:
      return false;
  }
}

export function cleanFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "";
  return (
    base
      .replace(/[\u0000-\u001f]/g, "")
      .trim()
      .slice(0, 200) || "document"
  );
}
