import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, PageHeader, StatCard, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, formatHours, percent, timeAgo } from "@/lib/format";
import { responseStats } from "@/lib/jobs";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  await requireRole("ADMIN");
  const now = new Date();

  const [
    candidateCounts,
    pendingRecruiters,
    openJobs,
    applications,
    openReports,
    restricted,
    flagged,
    pendingQueue,
    recruiters,
  ] = await Promise.all([
    db.candidateProfile.groupBy({ by: ["verificationStatus"], _count: true }),
    db.recruiterProfile.count({ where: { approvalStatus: "PENDING" } }),
    db.job.count({ where: { status: "OPEN" } }),
    db.application.findMany({
      select: { status: true, createdAt: true, respondedAt: true },
    }),
    db.ghostingReport.count({ where: { status: "OPEN" } }),
    db.user.count({ where: { status: "RESTRICTED" } }),
    db.user.count({ where: { flagged: true } }),
    db.candidateProfile.findMany({
      where: { verificationStatus: "PENDING" },
      include: { user: { select: { name: true } } },
      orderBy: { submittedAt: "asc" },
      take: 5,
    }),
    db.recruiterProfile.findMany({
      where: { approvalStatus: "APPROVED" },
      include: {
        user: { select: { name: true, flagged: true } },
        company: { select: { name: true } },
        jobs: {
          select: {
            applications: {
              select: { status: true, createdAt: true, respondedAt: true },
            },
          },
        },
      },
    }),
  ]);

  const candidates = (s: string) => candidateCounts.find((c) => c.verificationStatus === s)?._count ?? 0;
  const stats = responseStats(applications, now);
  const joined = applications.filter((a) => a.status === "JOINED").length;
  const notJoined = applications.filter((a) => a.status === "NOT_JOINED").length;

  const recruiterRows = recruiters
    .map((r) => {
      const apps = r.jobs.flatMap((j) => j.applications);
      return {
        id: r.id,
        name: r.user.name,
        flagged: r.user.flagged,
        company: r.company.name,
        total: apps.length,
        ...responseStats(apps, now),
        joined: apps.filter((a) => a.status === "JOINED").length,
        notJoined: apps.filter((a) => a.status === "NOT_JOINED").length,
      };
    })
    .sort((a, b) => b.overdue - a.overdue || b.total - a.total);

  return (
    <>
      <PageHeader
        title="Admin dashboard"
        description="Verification queue, response discipline and joining outcomes across Readyhire."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending verifications"
          value={candidates("PENDING")}
          tone={candidates("PENDING") ? "amber" : "neutral"}
          href="/admin/verifications"
          hint={`${candidates("VERIFIED")} verified · ${candidates("REJECTED")} need changes · ${candidates("NOT_SUBMITTED")} not submitted`}
        />
        <StatCard
          label="Pending recruiter approvals"
          value={pendingRecruiters}
          tone={pendingRecruiters ? "amber" : "neutral"}
          href="/admin/recruiters"
          hint={`${recruiters.length} approved · ${openJobs} open jobs`}
        />
        <StatCard
          label="Recruiter response rate"
          value={percent(stats.responded, stats.expected)}
          tone="blue"
          hint={stats.avgHours != null ? `Avg. first response ${formatHours(stats.avgHours)}` : "No responses yet"}
          href="/admin/applications"
        />
        <StatCard
          label="Overdue responses"
          value={stats.overdue}
          tone={stats.overdue ? "red" : "green"}
          hint="Applications past the 72 h SLA"
          href="/admin/applications?status=APPLIED"
        />
        <StatCard
          label="Joining rate"
          value={percent(joined, joined + notJoined)}
          tone="green"
          hint={`${joined} joined · ${notJoined} did not join`}
        />
        <StatCard label="Applications" value={applications.length} href="/admin/applications" />
        <StatCard
          label="Open ghosting reports"
          value={openReports}
          tone={openReports ? "amber" : "neutral"}
          href="/admin/reports"
        />
        <StatCard label="Flagged / restricted users" value={`${flagged} / ${restricted}`} href="/admin/users" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card title="Verification queue" description="Oldest submissions first.">
          {pendingQueue.length === 0 ? (
            <p className="text-sm text-slate-500">Queue is empty.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingQueue.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <Link href={`/admin/verifications/${c.id}`} className="font-medium text-slate-900 hover:underline">
                      {c.user.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {c.city ?? "—"} · submitted {c.submittedAt ? timeAgo(c.submittedAt) : "—"}
                    </p>
                  </div>
                  {(c.city === "Hyderabad" || c.city === "Bengaluru") && (
                    <Badge tone="violet">In-person eligible</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recruiter response discipline"
          description={`Updated ${formatDateTime(now)}`}
          bodyClassName="px-2 py-2"
        >
          <Table head={["Recruiter", "Applications", "Response rate", "Avg. response", "Overdue", "Joined / not"]}>
            {recruiterRows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <p className="font-medium text-slate-900">
                    {r.name} {r.flagged && <Badge tone="red">Flagged</Badge>}
                  </p>
                  <p className="text-xs text-slate-500">{r.company}</p>
                </Td>
                <Td>{r.total}</Td>
                <Td>{percent(r.responded, r.expected)}</Td>
                <Td>{r.avgHours != null ? formatHours(r.avgHours) : "—"}</Td>
                <Td>{r.overdue ? <Badge tone="red">{r.overdue}</Badge> : "0"}</Td>
                <Td>
                  {r.joined} / {r.notJoined}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
