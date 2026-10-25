import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationStatusBadge } from "@/components/status";
import { Badge, Card, EmptyState, PageHeader, Table, Td, cx } from "@/components/ui";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth";
import { APPLICATION_STATUS_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatHours, hoursSince } from "@/lib/format";
import { responseDueAt } from "@/lib/jobs";

export const metadata: Metadata = { title: "Applications" };

const STATUSES = Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[];

export default async function AdminApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  await requireRole("ADMIN");
  const { status: statusParam } = await searchParams;
  const status = STATUSES.find((s) => s === statusParam);
  const now = new Date();

  const applications = await db.application.findMany({
    where: status ? { status } : {},
    include: {
      job: {
        include: {
          company: true,
          recruiter: { include: { user: { select: { name: true } } } },
        },
      },
      candidate: { include: { user: { select: { name: true } } } },
      // The offer message, when there is one, is the recruiter's latest reply.
      events: { where: { type: "OFFERED" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every application, the recruiter's response and the joining outcome."
      />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter by status">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/applications?status=${s}` : "/admin/applications"}
            aria-current={s === status ? "page" : undefined}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset",
              s === status
                ? "bg-brand-700 text-white ring-brand-700"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {s ? APPLICATION_STATUS_LABEL[s] : "All"}
          </Link>
        ))}
      </nav>
      {applications.length === 0 ? (
        <EmptyState title="No applications" />
      ) : (
        <Card bodyClassName="px-2 py-2">
          <Table head={["Candidate", "Job", "Recruiter", "Applied", "Status", "Response", "Recruiter's reply"]}>
            {applications.map((a) => {
              const due = responseDueAt(a.createdAt);
              return (
                <tr key={a.id}>
                  <Td>
                    <Link
                      href={`/admin/verifications/${a.candidateId}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {a.candidate.user.name}
                    </Link>
                  </Td>
                  <Td>
                    {a.job.title}
                    <p className="text-xs text-slate-500">{a.job.company.name}</p>
                  </Td>
                  <Td>{a.job.recruiter.user.name}</Td>
                  <Td className="whitespace-nowrap">{formatDate(a.createdAt)}</Td>
                  <Td>
                    <ApplicationStatusBadge status={a.status} />
                    {a.outcomeAt && <p className="mt-1 text-xs text-slate-500">{formatDate(a.outcomeAt)}</p>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {a.respondedAt ? (
                      `${formatHours(hoursSince(a.createdAt, a.respondedAt))}`
                    ) : a.status === "APPLIED" && due < now ? (
                      <Badge tone="red">Overdue</Badge>
                    ) : a.status === "APPLIED" ? (
                      <Badge tone="amber">Pending</Badge>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="max-w-xs">
                    <p className="line-clamp-2 text-xs text-slate-600">
                      {a.status === "REJECTED"
                        ? `${a.rejectionCategory}: ${a.rejectionReason}`
                        : (a.events[0]?.message ?? a.responseMessage ?? "—")}
                    </p>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}
    </>
  );
}
