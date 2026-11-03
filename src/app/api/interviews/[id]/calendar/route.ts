import { absoluteUrl } from "@/lib/email/templates";
import { getCurrentUser } from "@/lib/auth";
import { INTERVIEW_MODE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { buildIcs } from "@/lib/ics";

/**
 * "Add to calendar" for an interview, as an .ics file. Only the candidate, the job's recruiter and admins can
 * download it, and it carries no personal details (docs/architecture/hiring-coordination.md, rule R4).
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/interviews/[id]/calendar">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user?.emailVerifiedAt) return new Response("Not signed in", { status: 401 });

  const interview = await db.interview.findUnique({
    where: { id },
    include: {
      application: {
        select: {
          id: true,
          candidate: { select: { userId: true } },
          job: {
            select: { title: true, company: { select: { name: true } }, recruiter: { select: { userId: true } } },
          },
        },
      },
    },
  });
  const app = interview?.application;
  const path = !app
    ? null
    : user.role === "ADMIN"
      ? "/admin/applications"
      : user.role === "CANDIDATE" && app.candidate.userId === user.id
        ? `/candidate/applications/${app.id}`
        : user.role === "RECRUITER" && app.job.recruiter.userId === user.id
          ? `/recruiter/applications/${app.id}`
          : null;
  if (!interview || !app || !path) return new Response("Not found", { status: 404 });

  const ics = buildIcs({
    uid: `interview-${interview.id}@readyhire`,
    start: interview.scheduledAt,
    durationMins: interview.durationMins,
    summary: `${interview.round}: ${app.job.title}, ${app.job.company.name}`,
    location: interview.location ?? INTERVIEW_MODE_LABEL[interview.mode],
    description: `${interview.round} for ${app.job.title} at ${app.job.company.name} (${INTERVIEW_MODE_LABEL[interview.mode]}, ${interview.durationMins} min).`,
    url: absoluteUrl(path),
    cancelled: interview.status === "CANCELLED",
    sequence: Math.floor(interview.updatedAt.getTime() / 1000),
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${interview.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
