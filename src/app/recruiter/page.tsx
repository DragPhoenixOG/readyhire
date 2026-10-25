import type { Metadata } from "next";
import Link from "next/link";
import { CommitmentBadge, OffersBadge } from "@/components/candidate-signals";
import { ApprovalBadge } from "@/components/status";
import { Badge, Card, DescriptionList, EmptyState, PageHeader, StatCard, buttonClass } from "@/components/ui";
import { requireRecruiter } from "@/lib/auth";
import { candidateSummaryInclude, summarizeCandidate } from "@/lib/candidate";
import { INTERVIEW_MODE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatHours, hoursSince, percent } from "@/lib/format";
import { responseDueAt, responseStats } from "@/lib/jobs";

export const metadata: Metadata = { title: "Recruiter dashboard" };

export default async function RecruiterDashboard() {
  const { user, recruiter } = await requireRecruiter();

  if (recruiter.approvalStatus !== "APPROVED") {
    return (
      <>
        <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} actions={<ApprovalBadge status={recruiter.approvalStatus} />} />
        <Card className="max-w-2xl" title={recruiter.approvalStatus === "PENDING" ? "Your account is awaiting approval" : "Your account was not approved"}>
          <p className="text-sm text-slate-600">
            {recruiter.approvalStatus === "PENDING"
              ? "The Readyhire team checks every recruiter's company domain before they can post jobs or see candidates. This usually takes less than a business day."
              : (recruiter.reviewNote ?? "Contact support@readyhire.in for details.")}
          </p>
          <div className="mt-4">
            <DescriptionList
              items={[
                { label: "Company", value: recruiter.company.name },
                { label: "Verified email domain", value: recruiter.company.domain },
                { label: "Website", value: recruiter.company.website ?? "—" },
                { label: "Signed up", value: formatDate(recruiter.createdAt) },
              ]}
            />
          </div>
        </Card>
      </>
    );
  }

  const now = new Date();
  const mine = { job: { recruiterId: recruiter.id } };
  const [awaiting, interviews, offers, all] = await Promise.all([
    db.application.findMany({
      where: { ...mine, status: "APPLIED" },
      include: { job: true, candidate: { include: candidateSummaryInclude } },
      orderBy: { createdAt: "asc" },
    }),
    db.interview.findMany({
      where: { status: "SCHEDULED", scheduledAt: { gte: now }, application: mine },
      include: { application: { include: { job: true, candidate: { include: { user: true } } } } },
      orderBy: { scheduledAt: "asc" },
      take: 6,
    }),
    db.application.findMany({
      where: { ...mine, status: "OFFERED" },
      include: { job: true, candidate: { include: candidateSummaryInclude } },
      orderBy: { offerJoiningDate: "asc" },
    }),
    db.application.findMany({ where: mine, select: { status: true, createdAt: true, respondedAt: true } }),
  ]);

  const stats = responseStats(all, now);
  const joined = all.filter((a) => a.status === "JOINED").length;
  const notJoined = all.filter((a) => a.status === "NOT_JOINED").length;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`${recruiter.company.name} · ${recruiter.company.domain}`}
        actions={
          <Link href="/recruiter/jobs/new" className={buttonClass("primary")}>
            Post a job
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Awaiting your response"
          value={awaiting.length}
          tone={stats.overdue ? "red" : awaiting.length ? "amber" : "neutral"}
          hint={stats.overdue ? `${stats.overdue} overdue` : "All within 72 h"}
          href="/recruiter/applications?tab=response"
        />
        <StatCard
          label="Response rate"
          value={percent(stats.responded, stats.expected)}
          hint={stats.avgHours != null ? `Avg. first response ${formatHours(stats.avgHours)}` : "No responses yet"}
        />
        <StatCard label="Offers out" value={offers.length} tone={offers.length ? "blue" : "neutral"} href="/recruiter/applications?tab=offers" />
        <StatCard
          label="Joined / not joined"
          value={`${joined} / ${notJoined}`}
          tone={joined ? "green" : "neutral"}
          hint={`Joining rate ${percent(joined, joined + notJoined)}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Respond next" description="Oldest first. Accept with a message or reject with a reason.">
          {awaiting.length === 0 ? (
            <p className="text-sm text-slate-500">You&apos;re all caught up.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {awaiting.slice(0, 6).map((a) => {
                const summary = summarizeCandidate(a.candidate, now);
                const due = responseDueAt(a.createdAt);
                const late = due < now;
                return (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0 text-sm">
                      <Link href={`/recruiter/applications/${a.id}`} className="font-medium text-slate-900 hover:underline">
                        {a.candidate.user.name}
                      </Link>
                      <p className="text-slate-600">{a.job.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <OffersBadge summary={summary} />
                        <CommitmentBadge summary={summary} applicationId={a.id} recruiterId={recruiter.id} />
                      </div>
                    </div>
                    <Badge tone={late ? "red" : "amber"}>
                      {late ? `Overdue by ${formatHours(hoursSince(due, now))}` : `Due in ${formatHours(-hoursSince(due, now))}`}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Upcoming interviews">
          {interviews.length === 0 ? (
            <p className="text-sm text-slate-500">No interviews scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {interviews.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/recruiter/applications/${i.applicationId}`} className="font-medium text-slate-900 hover:underline">
                      {i.application.candidate.user.name}
                    </Link>
                    <p className="text-slate-600">
                      {i.round} · {i.application.job.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(i.scheduledAt)} · {INTERVIEW_MODE_LABEL[i.mode]}
                    </p>
                  </div>
                  <Badge tone={i.candidateConfirmed ? "green" : "neutral"}>{i.candidateConfirmed ? "Confirmed" : "Unconfirmed"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6" title="Offers awaiting joining" description="Mark each one joined or not joined once the joining date passes.">
        {offers.length === 0 ? (
          <EmptyState title="No open offers" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {offers.map((a) => {
              const summary = summarizeCandidate(a.candidate, now);
              const dueForOutcome = a.offerJoiningDate && a.offerJoiningDate < now;
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/recruiter/applications/${a.id}`} className="font-medium text-slate-900 hover:underline">
                      {a.candidate.user.name}
                    </Link>{" "}
                    <span className="text-slate-600">· {a.job.title}</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <CommitmentBadge summary={summary} applicationId={a.id} recruiterId={recruiter.id} />
                      <OffersBadge summary={summary} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-700">Joining {formatDate(a.offerJoiningDate)}</p>
                    {dueForOutcome && <p className="text-xs font-medium text-amber-700">Record the joining outcome</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
