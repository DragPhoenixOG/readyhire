import type { Metadata } from "next";
import Link from "next/link";
import { RecruiterApplicationsTable } from "@/components/recruiter-applications-table";
import { Card, EmptyState, PageHeader, cx } from "@/components/ui";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { requireApprovedRecruiter } from "@/lib/auth";
import { candidateSummaryInclude } from "@/lib/candidate";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Applications" };

const TABS: { key: string; label: string; statuses?: ApplicationStatus[] }[] = [
  { key: "response", label: "Needs response", statuses: ["APPLIED"] },
  { key: "progress", label: "In progress", statuses: ["ACCEPTED", "INTERVIEWING"] },
  { key: "offers", label: "Offers", statuses: ["OFFERED"] },
  { key: "closed", label: "Closed", statuses: ["JOINED", "NOT_JOINED", "REJECTED", "WITHDRAWN"] },
  { key: "all", label: "All" },
];

export default async function RecruiterApplicationsPage({ searchParams }: PageProps<"/recruiter/applications">) {
  const { recruiter } = await requireApprovedRecruiter();
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam) ?? TABS[0];
  const mine = { job: { recruiterId: recruiter.id } };

  const [applications, counts] = await Promise.all([
    db.application.findMany({
      where: { ...mine, ...(tab.statuses ? { status: { in: tab.statuses } } : {}) },
      include: { job: true, candidate: { include: candidateSummaryInclude } },
      // Oldest first when responding, so the most overdue are on top.
      orderBy: tab.key === "response" ? { createdAt: "asc" } : { updatedAt: "desc" },
    }),
    db.application.groupBy({ by: ["status"], where: mine, _count: true }),
  ]);
  const countFor = (t: (typeof TABS)[number]) =>
    counts.filter((c) => !t.statuses || t.statuses.includes(c.status)).reduce((n, c) => n + c._count, 0);

  return (
    <>
      <PageHeader title="Applications" description="Every application must be accepted or rejected with a reason within 72 hours." />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Application status">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/recruiter/applications?tab=${t.key}`}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset",
              t.key === tab.key ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {t.label} <span className="opacity-75">{countFor(t)}</span>
          </Link>
        ))}
      </nav>
      {applications.length === 0 ? (
        <EmptyState title={tab.key === "response" ? "You're all caught up" : "Nothing here yet"} />
      ) : (
        <Card bodyClassName="px-2 py-2">
          <RecruiterApplicationsTable applications={applications} recruiterId={recruiter.id} />
        </Card>
      )}
    </>
  );
}
