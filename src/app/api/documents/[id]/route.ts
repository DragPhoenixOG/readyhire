import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/uploads";

/** Serves an uploaded document to its owner or an admin. Recruiters only ever see the verified summary. */
export async function GET(_request: Request, { params }: RouteContext<"/api/documents/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const document = await db.document.findUnique({
    where: { id },
    include: { candidate: { select: { userId: true } } },
  });
  const allowed = document && (user.role === "ADMIN" || document.candidate.userId === user.id);
  if (!allowed) return new Response("Not found", { status: 404 });

  let file: Buffer;
  try {
    file = await readStoredFile(document.storedName);
  } catch {
    return new Response("File missing", { status: 404 });
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      "Cache-Control": "private, no-store",
      // Uploads are checked by content on the way in; never let the browser guess another type.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
