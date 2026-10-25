import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentStore } from "@/lib/storage";

/**
 * Opens a candidate's resume by redirecting to a link that expires in 60 seconds. Resumes carry contact details,
 * so besides the candidate and admins, only approved recruiters the candidate has applied to can open them.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/resumes/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user?.emailVerifiedAt) return new Response("Not signed in", { status: 401 });

  const resume = await db.resume.findUnique({
    where: { id },
    include: { candidate: { select: { userId: true } } },
  });
  const allowed =
    resume &&
    (user.role === "ADMIN" ||
      resume.candidate.userId === user.id ||
      (user.role === "RECRUITER" &&
        (await db.application.count({
          where: {
            candidateId: resume.candidateId,
            job: { recruiter: { userId: user.id, approvalStatus: "APPROVED" } },
          },
        })) > 0));
  if (!allowed) return new Response("Not found", { status: 404 });

  const url = await documentStore().downloadUrl(resume.storageKey, resume.fileName, resume.mimeType);
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
