import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationStatusBadge, CheckIcon, VerificationBadge } from "@/components/status";
import { Card, EmptyState, PageHeader, StatCard, buttonClass, cx } from "@/components/ui";
import type { DocumentStatus } from "@/generated/prisma/enums";
import { requireCandidate } from "@/lib/auth";
import {
  ACTIVE_OFFER_STATUSES,
  DOCUMENT_INFO,
  INTERVIEW_MODE_LABEL,
  OPEN_APPLICATION_STATUSES,
  REQUIRED_DOCUMENTS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { daysFromToday, formatDate, formatDateTime, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function CandidateDashboard() {
  const { user, profile } = await requireCandidate();
  const [documents, applications, activeOffers, interviews] = await Promise.all([
    db.document.findMany({
      where: { candidateId: profile.id, type: { in: REQUIRED_DOCUMENTS } },
    }),
    db.application.findMany({
      where: { candidateId: profile.id },
      include: {
        job: { include: { company: true } },
        // The offer message, when there is one, is the recruiter's latest word.
        events: { where: { type: "OFFERED" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.offer.count({
      where: {
        candidateId: profile.id,
        status: { in: ACTIVE_OFFER_STATUSES },
      },
    }),
    db.interview.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gte: new Date() },
        application: { candidateId: profile.id },
      },
      include: {
        application: { include: { job: { include: { company: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ]);

  const committed = applications.find((a) => a.id === profile.committedApplicationId);
  const open = applications.filter((a) => OPEN_APPLICATION_STATUSES.includes(a.status));
  const awaiting = applications.filter((a) => a.status === "APPLIED").length;
  const platformOffers = applications.filter((a) => a.status === "OFFERED").length;
  const responses = applications.filter((a) => a.respondedAt).slice(0, 5);

  const docStatus = (type: (typeof REQUIRED_DOCUMENTS)[number]): DocumentStatus | "MISSING" =>
    documents.find((d) => d.type === type)?.status ?? "MISSING";

  const steps = [
    { label: "Profile basics", done: !!profile.currentCompany },
    {
      label: "Notice details",
      done: profile.noticePeriodDays != null && !!profile.resignationDate && !!profile.lastWorkingDay,
    },
    ...REQUIRED_DOCUMENTS.map((type) => ({
      label: DOCUMENT_INFO[type].label,
      done: docStatus(type) !== "MISSING" && docStatus(type) !== "REJECTED",
      note: docStatus(type) === "VERIFIED" ? "verified" : docStatus(type) === "REJECTED" ? "rejected" : undefined,
    })),
    {
      label: "Submitted for review",
      done: profile.verificationStatus === "PENDING" || profile.verificationStatus === "VERIFIED",
    },
    {
      label: "Verified by Readyhire",
      done: profile.verificationStatus === "VERIFIED",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Your verification, commitment and applications at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open applications" value={open.length} href="/candidate/applications" />
        <StatCard
          label="Awaiting recruiter response"
          value={awaiting}
          tone={awaiting ? "amber" : "neutral"}
          hint="Recruiters must reply within 72 h"
        />
        <StatCard
          label="Upcoming interviews"
          value={interviews.length}
          tone={interviews.length ? "violet" : "neutral"}
        />
        <StatCard
          label="Active offers (visible to recruiters)"
          value={activeOffers + platformOffers}
          href="/candidate/offers"
          hint={`${activeOffers} declared · ${platformOffers} via Readyhire`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Upcoming interviews">
          {interviews.length === 0 ? (
            <p className="text-sm text-slate-500">No interviews scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {interviews.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-slate-900">
                      {i.round} · {i.application.job.title}
                    </p>
                    <p className="text-slate-600">
                      {i.application.job.company.name} · {INTERVIEW_MODE_LABEL[i.mode]}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(i.scheduledAt)}</p>
                  </div>
                  <Link
                    href={`/candidate/applications/${i.applicationId}`}
                    className={buttonClass(i.candidateConfirmed ? "ghost" : "primary", "sm")}
                  >
                    {i.candidateConfirmed ? "Confirmed" : "Confirm"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent recruiter responses">
          {responses.length === 0 ? (
            <EmptyState
              title="No responses yet"
              description="Every application gets an accept or a reject with a reason."
              action={
                <Link href="/candidate/jobs" className={buttonClass("secondary", "sm")}>
                  Browse jobs
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {responses.map((a) => (
                <li key={a.id} className="py-2.5">
                  <Link href={`/candidate/applications/${a.id}`} className="group block">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 group-hover:underline">
                        {a.job.title} · {a.job.company.name}
                      </p>
                      <ApplicationStatusBadge status={a.status} />
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                      {a.status === "REJECTED" ? a.rejectionReason : (a.events[0]?.message ?? a.responseMessage)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Verification"
          description="Recruiters only see verified candidates."
          actions={<VerificationBadge status={profile.verificationStatus} />}
        >
          <ol className="grid gap-2 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                <span
                  className={cx(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                    s.done ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white",
                  )}
                >
                  {s.done && <CheckIcon className="h-3 w-3" />}
                </span>
                <span className={s.done ? "text-slate-900" : "text-slate-500"}>{s.label}</span>
                {"note" in s && s.note && (
                  <span className={cx("text-xs", s.note === "rejected" ? "text-rose-600" : "text-emerald-700")}>
                    ({s.note})
                  </span>
                )}
              </li>
            ))}
          </ol>
          {profile.verificationStatus === "VERIFIED" && profile.lastWorkingDay ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Verified notice: {profile.noticePeriodDays} days · last working day {formatDate(profile.lastWorkingDay)}
              {daysFromToday(profile.lastWorkingDay) > 0
                ? ` (in ${daysFromToday(profile.lastWorkingDay)} days)`
                : " (notice served)"}
            </p>
          ) : (
            <Link href="/candidate/verification" className={cx(buttonClass("primary", "sm"), "mt-4")}>
              Continue verification
            </Link>
          )}
        </Card>

        <Card title="Commitment" description="You can commit to one role at a time.">
          {committed ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-900">{committed.job.title}</p>
              <p className="text-slate-600">{committed.job.company.name}</p>
              <p className="text-xs text-slate-500">
                Committed {profile.committedAt ? timeAgo(profile.committedAt) : ""}
              </p>
              <Link href={`/candidate/applications/${committed.id}`} className={buttonClass("secondary", "sm")}>
                View application
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              You haven&apos;t committed to a role. Once a recruiter accepts your application you can commit to it from
              the application page.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
