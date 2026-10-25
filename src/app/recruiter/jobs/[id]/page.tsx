import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setJobStatus } from "@/actions/recruiter";
import { ActionForm } from "@/components/action-form";
import { JobMeta } from "@/components/job-meta";
import { RecruiterApplicationsTable } from "@/components/recruiter-applications-table";
import { Badge, Card, Chips, EmptyState, PageHeader } from "@/components/ui";
import { requireApprovedRecruiter } from "@/lib/auth";
import { candidateSummaryInclude } from "@/lib/candidate";
import { db } from "@/lib/db";
import { formatDate, splitList } from "@/lib/format";

export const metadata: Metadata = { title: "Job" };

export default async function RecruiterJobPage({ params }: PageProps<"/recruiter/jobs/[id]">) {
  const { id } = await params;
  const { recruiter } = await requireApprovedRecruiter();
  const job = await db.job.findFirst({
    where: { id, recruiterId: recruiter.id },
    include: {
      applications: {
        include: { job: true, candidate: { include: candidateSummaryInclude } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!job) notFound();

  return (
    <>
      <PageHeader
        title={job.title}
        description={`Posted ${formatDate(job.createdAt)}`}
        back={{ href: "/recruiter/jobs", label: "Jobs" }}
        actions={
          <>
            <Badge tone={job.status === "OPEN" ? "green" : "neutral"}>
              {job.status === "OPEN" ? "Open" : "Closed"}
            </Badge>
            <ActionForm
              action={setJobStatus}
              submitLabel={job.status === "OPEN" ? "Close job" : "Reopen job"}
              variant="secondary"
              size="sm"
              className="flex flex-col items-end gap-2 space-y-0"
            >
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="status" value={job.status === "OPEN" ? "CLOSED" : "OPEN"} />
            </ActionForm>
          </>
        }
      />
      <div className="space-y-6">
        <Card title={`Applications (${job.applications.length})`} bodyClassName="px-2 py-2">
          {job.applications.length === 0 ? (
            <div className="p-3">
              <EmptyState title="No applications yet" description="Verified candidates who apply will appear here." />
            </div>
          ) : (
            <RecruiterApplicationsTable applications={job.applications} recruiterId={recruiter.id} showJob={false} />
          )}
        </Card>
        <Card title="Job details">
          <JobMeta job={job} />
          <div className="mt-3">
            <Chips items={splitList(job.skills)} />
          </div>
          <p className="mt-4 text-sm leading-6 whitespace-pre-line text-slate-700">{job.description}</p>
        </Card>
      </div>
    </>
  );
}
