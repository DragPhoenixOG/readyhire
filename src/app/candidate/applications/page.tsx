import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationStatusBadge } from "@/components/status";
import { Badge, Card, EmptyState, PageHeader, Table, Td, buttonClass } from "@/components/ui";
import { requireCandidate } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Applications" };

export default async function CandidateApplicationsPage() {
  const { profile } = await requireCandidate();
  const applications = await db.application.findMany({
    where: { candidateId: profile.id },
    include: {
      job: { include: { company: true } },
      interviews: { where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: "asc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Applications" description="Every application gets an accept or a reject with a reason." />
      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          action={
            <Link href="/candidate/jobs" className={buttonClass("primary", "sm")}>
              Browse jobs
            </Link>
          }
        />
      ) : (
        <Card bodyClassName="px-2 py-2">
          <Table head={["Role", "Applied", "Status", "Recruiter response", "Next interview"]}>
            {applications.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/candidate/applications/${a.id}`} className="font-medium text-slate-900 hover:underline">
                    {a.job.title}
                  </Link>
                  <p className="text-xs text-slate-500">{a.job.company.name}</p>
                  {a.id === profile.committedApplicationId && (
                    <span className="mt-1 inline-block">
                      <Badge tone="green">Committed</Badge>
                    </span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">{formatDate(a.createdAt)}</Td>
                <Td>
                  <ApplicationStatusBadge status={a.status} />
                </Td>
                <Td className="max-w-xs">
                  <p className="line-clamp-2 text-sm">
                    {a.status === "APPLIED"
                      ? "Waiting for response"
                      : a.status === "REJECTED"
                        ? a.rejectionReason
                        : (a.responseMessage ?? "—")}
                  </p>
                </Td>
                <Td className="whitespace-nowrap text-xs">{a.interviews[0] ? formatDateTime(a.interviews[0].scheduledAt) : "—"}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
