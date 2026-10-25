import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { commitToApplication, confirmInterview, releaseCommitment, withdrawApplication } from "@/actions/candidate";
import { ActionForm } from "@/components/action-form";
import { InterviewList } from "@/components/interview-list";
import { JobMeta } from "@/components/job-meta";
import { ApplicationStatusBadge } from "@/components/status";
import { Timeline } from "@/components/timeline";
import { Disclosure } from "@/components/disclosure";
import { Card, Field, Notice, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { requireCandidate } from "@/lib/auth";
import { COMMITTABLE_STATUSES, MIN_REASON_LENGTH, OPEN_APPLICATION_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { INTERNAL_EVENTS } from "@/lib/events";
import { formatDate, formatDateTime, formatLpa } from "@/lib/format";
import { responseDueAt } from "@/lib/jobs";

export const metadata: Metadata = { title: "Application" };

export default async function CandidateApplicationPage({ params }: PageProps<"/candidate/applications/[id]">) {
  const { id } = await params;
  const { profile } = await requireCandidate();
  const application = await db.application.findFirst({
    where: { id, candidateId: profile.id },
    include: {
      job: {
        include: {
          company: true,
          recruiter: { include: { user: { select: { name: true } } } },
        },
      },
      interviews: { orderBy: { scheduledAt: "asc" } },
      events: {
        where: { type: { notIn: INTERNAL_EVENTS } },
        include: { actor: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!application) notFound();

  const { job } = application;
  const isCommitted = profile.committedApplicationId === application.id;
  const canCommit = COMMITTABLE_STATUSES.includes(application.status) && !profile.committedApplicationId;
  const isOpen = OPEN_APPLICATION_STATUSES.includes(application.status);
  const due = responseDueAt(application.createdAt);
  // Once an offer is out, it is the recruiter's latest word (events are newest first).
  const latestOffer = ["OFFERED", "JOINED", "NOT_JOINED"].includes(application.status)
    ? application.events.find((e) => e.type === "OFFERED")
    : undefined;

  return (
    <>
      <PageHeader
        title={job.title}
        description={`${job.company.name} · recruiter ${job.recruiter.user.name}`}
        back={{ href: "/candidate/applications", label: "Applications" }}
        actions={<ApplicationStatusBadge status={application.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-6">
          <Card title="Recruiter response">
            {application.status === "APPLIED" ? (
              <Notice
                tone={due < new Date() ? "red" : "amber"}
                title={due < new Date() ? "Response overdue" : "Awaiting response"}
              >
                The recruiter must accept or reject your application by {formatDateTime(due)}.
                {due < new Date() && " Readyhire has flagged this to the recruiter."}
              </Notice>
            ) : application.status === "REJECTED" ? (
              <Notice
                tone="red"
                title={`Not moving forward${application.rejectionCategory ? ` — ${application.rejectionCategory}` : ""}`}
              >
                <p className="whitespace-pre-line">{application.rejectionReason}</p>
              </Notice>
            ) : application.status === "WITHDRAWN" ? (
              <Notice tone="neutral" title="You withdrew this application">
                {application.withdrawnReason}
              </Notice>
            ) : latestOffer ? (
              <Notice tone="green" title={`Offer extended ${formatDate(latestOffer.createdAt)}`}>
                <p className="whitespace-pre-line">
                  {latestOffer.message ??
                    `${formatLpa(application.offerCtcLpa) ?? "CTC shared separately"} · joining ${formatDate(application.offerJoiningDate)}`}
                </p>
              </Notice>
            ) : (
              <Notice tone="green" title={`Accepted ${formatDate(application.respondedAt)}`}>
                <p className="whitespace-pre-line">{application.responseMessage}</p>
              </Notice>
            )}
          </Card>

          {(application.status === "OFFERED" ||
            application.status === "JOINED" ||
            application.status === "NOT_JOINED") && (
            <Card title="Offer">
              <p className="text-sm text-slate-700">
                {formatLpa(application.offerCtcLpa) ?? "CTC shared separately"} · joining{" "}
                {formatDate(application.offerJoiningDate)}
              </p>
              {application.status === "JOINED" && (
                <p className="mt-2 text-sm font-medium text-emerald-700">
                  Joined — recorded {formatDate(application.outcomeAt)}.
                </p>
              )}
              {application.status === "NOT_JOINED" && (
                <p className="mt-2 text-sm text-rose-700">Marked as not joined: {application.notJoinedReason}</p>
              )}
            </Card>
          )}

          <Card title="Interviews">
            <InterviewList
              interviews={application.interviews}
              renderAction={(interview) =>
                interview.status === "SCHEDULED" &&
                !interview.candidateConfirmed &&
                interview.scheduledAt > new Date() ? (
                  <ActionForm action={confirmInterview} submitLabel="Confirm attendance" size="sm">
                    <input type="hidden" name="interviewId" value={interview.id} />
                  </ActionForm>
                ) : null
              }
            />
          </Card>

          <Card title="Activity">
            <Timeline events={application.events} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Commitment" description="Commit to the one role you intend to join.">
            {isCommitted ? (
              <div className="space-y-3">
                <Notice tone="green" title="You're committed to this role">
                  Since {formatDate(profile.committedAt)}. You can&apos;t apply elsewhere while committed.
                </Notice>
                <Disclosure summary="Release commitment">
                  <ActionForm action={releaseCommitment} submitLabel="Release commitment" variant="danger" size="sm">
                    <Field
                      label="Why are you releasing it?"
                      htmlFor="release-reason"
                      hint={`At least ${MIN_REASON_LENGTH} characters. Releases are visible to recruiters.`}
                    >
                      <textarea
                        id="release-reason"
                        name="reason"
                        rows={3}
                        required
                        minLength={MIN_REASON_LENGTH}
                        className={inputClass}
                      />
                    </Field>
                  </ActionForm>
                </Disclosure>
              </div>
            ) : canCommit ? (
              <ActionForm
                action={commitToApplication}
                submitLabel="Commit to this role"
                confirm="You can only commit to one role at a time and you won't be able to apply elsewhere until you release it. Commit?"
              >
                <input type="hidden" name="applicationId" value={application.id} />
                <p className="text-sm text-slate-600">
                  Committing tells the recruiter you intend to join. You can commit to only one role at a time.
                </p>
              </ActionForm>
            ) : profile.committedApplicationId && isOpen ? (
              <p className="text-sm text-slate-600">
                You&apos;re committed to{" "}
                <Link
                  href={`/candidate/applications/${profile.committedApplicationId}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  another role
                </Link>
                .
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                {application.status === "APPLIED"
                  ? "You can commit once the recruiter accepts your application."
                  : "This application can't be committed to."}
              </p>
            )}
          </Card>

          <Card title="Job">
            <JobMeta job={job} />
            <Link href={`/candidate/jobs/${job.id}`} className={`${buttonClass("ghost", "sm")} mt-3`}>
              View job description
            </Link>
          </Card>

          {isOpen && (
            <Disclosure summary="Withdraw application" tone="ghost">
              <ActionForm
                action={withdrawApplication}
                submitLabel="Withdraw"
                variant="danger"
                size="sm"
                confirm="Withdraw this application?"
              >
                <input type="hidden" name="applicationId" value={application.id} />
                <Field label="Reason (shared with the recruiter)" htmlFor="withdraw-reason">
                  <textarea
                    id="withdraw-reason"
                    name="reason"
                    rows={3}
                    required
                    minLength={MIN_REASON_LENGTH}
                    className={inputClass}
                  />
                </Field>
              </ActionForm>
            </Disclosure>
          )}
        </div>
      </div>
    </>
  );
}
