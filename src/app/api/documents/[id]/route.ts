import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentStore } from "@/lib/storage";

/**
 * Opens an uploaded document for its owner or an admin by redirecting to a link that expires in
 * 60 seconds. Recruiters never see raw documents, only the verified summary.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/documents/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user?.emailVerifiedAt) return new Response("Not signed in", { status: 401 });

  const document = await db.document.findUnique({
    where: { id },
    include: { candidate: { select: { userId: true } } },
  });
  const allowed = document && (user.role === "ADMIN" || document.candidate.userId === user.id);
  if (!allowed) return new Response("Not found", { status: 404 });

  const url = await documentStore().downloadUrl(document.storageKey, document.fileName, document.mimeType);
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
