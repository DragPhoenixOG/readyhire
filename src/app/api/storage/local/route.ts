import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { verifyPayload } from "@/lib/signing";
import { LOCAL_LINK_PURPOSE, type LocalLink, localPath, readLocalFile } from "@/lib/storage/local";
import { contentDisposition } from "@/lib/storage/types";

// Stand-in for S3 pre-signed URLs when STORAGE_DRIVER=local (development and tests).

async function link(request: Request, op: LocalLink["op"]) {
  if (env.STORAGE_DRIVER !== "local") return null;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = await verifyPayload<LocalLink>(LOCAL_LINK_PURPOSE, token);
  return payload?.op === op ? payload : null;
}

export async function GET(request: Request) {
  const payload = await link(request, "get");
  if (!payload || payload.op !== "get") return new Response("Link expired or invalid", { status: 403 });
  try {
    const file = await readLocalFile(payload.key);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": payload.contentType,
        "Content-Disposition": contentDisposition(payload.fileName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export async function PUT(request: Request) {
  const payload = await link(request, "put");
  if (!payload || payload.op !== "put") return new Response("Link expired or invalid", { status: 403 });
  if (request.headers.get("content-type") !== payload.contentType) {
    return new Response("Content type doesn't match the upload link", { status: 400 });
  }
  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength !== payload.size) return new Response("Size doesn't match the upload link", { status: 400 });

  const file = localPath(payload.key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return new Response(null, { status: 200 });
}
