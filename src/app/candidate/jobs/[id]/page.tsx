import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { applyToJob } from "@/actions/candidate";
import { ActionForm } from "@/components/action-form";
import { JobMeta } from "@/components/job-meta";
import { ApplicationStatusBadge } from "@/components/status";
import { Card, Chips, Field, Notice, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { requireCandidate } from "@/lib/auth";
import { RESPONSE_SLA_HOURS } from "@/lib/constants";
import { db } from "@/lib/db";
import { daysFromToday, formatDate, splitList } from "@/lib/format";
import { visibleJobWhere } from "@/lib/jobs";

export const metadata: Metadata = { title: "Job" };

export default async function CandidateJobPage({ params }: PageProps<"/candidate/jobs/[id]">) {
  const { id } = await params;
  const { profile } = await requireCandidate();
  const [job, application, joined] = await Promise.all([
    db.job.findFirst({
      where: { id, ...visibleJobWhere },
      include: { company: true },
    }),
    db.application.findUnique({
      where: { jobId_candidateId: { jobId: id, candidateId: profile.id } },
    }),
    db.application.findFirst({
      where: { candidateId: profile.id, status: "JOINED" },
    }),
  ]);
  // Candidates can still open a job they applied to after it closes.
  const closedJob = !job && application ? await db.job.findUnique({ where: { id }, include: { company: true } }) : null;
  const shown = job ?? closedJob;
  if (!shown) notFound();

  const daysToJoin = profile.lastWorkingDay ? Math.max(0, daysFromToday(profile.lastWorkingDay) + 1) : null;

  return (
    <>
      <PageHeader
        title={shown.title}
        description={shown.company.name}
        back={{ href: "/candidate/jobs", label: "All jobs" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <Card>
          <JobMeta job={shown} />
          <div className="mt-4">
            <Chips items={splitList(shown.skills)} />
          </div>
          <div className="mt-5 text-sm leading-6 whitespace-pre-line text-slate-700">{shown.description}</div>
        </Card>

        <div className="space-y-4">
          <Card title="Apply">
            {application ? (
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2">
                  You applied on {formatDate(application.createdAt)}{" "}
                  <ApplicationStatusBadge status={application.status} />
                </p>
                <Link href={`/candidate/applications/${application.id}`} className={buttonClass("secondary", "sm")}>
                  View application
                </Link>
              </div>
            ) : !job ? (
              <p className="text-sm text-slate-600">This job is no longer accepting applications.</p>
            ) : profile.verificationStatus !== "VERIFIED" ? (
              <Notice
                tone="amber"
                title="Verification required"
                action={
                  <Link href="/candidate/verification" className={buttonClass("secondary", "sm")}>
                    Verify now
                  </Link>
                }
              >
                Only verified candidates can apply.
              </Notice>
            ) : joined ? (
              <p className="text-sm text-slate-600">You&apos;ve already joined a company through Readyhire.</p>
            ) : profile.committedApplicationId ? (
              <Notice
                tone="amber"
                title="You're committed to another role"
                action={
                  <Link
                    href={`/candidate/applications/${profile.committedApplicationId}`}
                    className={buttonClass("secondary", "sm")}
                  >
                    View commitment
                  </Link>
                }
              >
                Release that commitment before applying elsewhere.
              </Notice>
            ) : (
              <ActionForm action={applyToJob} submitLabel="Apply with verified profile" pendingLabel="Applying…">
                <input type="hidden" name="jobId" value={job.id} />
                {job.maxJoiningDays != null && daysToJoin != null && daysToJoin > job.maxJoiningDays && (
                  <Notice tone="amber">
                    This team wants someone within {job.maxJoiningDays} days; your verified joining date is in{" "}
                    {daysToJoin} days.
                  </Notice>
                )}
                <Field label="Note to the recruiter (optional)" htmlFor="coverNote">
                  <textarea id="coverNote" name="coverNote" rows={4} maxLength={1000} className={inputClass} />
                </Field>
              </ActionForm>
            )}
          </Card>
          <p className="px-1 text-xs text-slate-500">
            Readyhire recruiters must accept or reject every application with a reason within {RESPONSE_SLA_HOURS}{" "}
            hours. Your verified notice period, active offer count and commitment status are shared with the recruiter.
          </p>
        </div>
      </div>
    </>
  );
}
