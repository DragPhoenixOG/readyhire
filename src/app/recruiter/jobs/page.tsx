import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Table, Td, buttonClass } from "@/components/ui";
import { requireApprovedRecruiter } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Jobs" };

export default async function RecruiterJobsPage() {
  const { recruiter } = await requireApprovedRecruiter();
  const jobs = await db.job.findMany({
    where: { recruiterId: recruiter.id },
    include: { applications: { select: { status: true } } },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <PageHeader
        title="Jobs"
        description={`Roles you've posted for ${recruiter.company.name}.`}
        actions={
          <Link href="/recruiter/jobs/new" className={buttonClass("primary")}>
            Post a job
          </Link>
        }
      />
      {jobs.length === 0 ? (
        <EmptyState title="No jobs yet" description="Post a job to start receiving applications from verified candidates." />
      ) : (
        <Card bodyClassName="px-2 py-2">
          <Table head={["Job", "Status", "Applications", "Awaiting response", "In progress", "Joined", "Posted"]}>
            {jobs.map((job) => {
              const by = (s: string[]) => job.applications.filter((a) => s.includes(a.status)).length;
              const awaiting = by(["APPLIED"]);
              return (
                <tr key={job.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/recruiter/jobs/${job.id}`} className="font-medium text-slate-900 hover:underline">
                      {job.title}
                    </Link>
                    <p className="text-xs text-slate-500">{job.location}</p>
                  </Td>
                  <Td>
                    <Badge tone={job.status === "OPEN" ? "green" : "neutral"}>{job.status === "OPEN" ? "Open" : "Closed"}</Badge>
                  </Td>
                  <Td>{job.applications.length}</Td>
                  <Td>{awaiting ? <Badge tone="amber">{awaiting}</Badge> : "0"}</Td>
                  <Td>{by(["ACCEPTED", "INTERVIEWING", "OFFERED"])}</Td>
                  <Td>{by(["JOINED"])}</Td>
                  <Td className="whitespace-nowrap">{formatDate(job.createdAt)}</Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}
    </>
  );
}
