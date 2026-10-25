import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  acceptApplication,
  extendOffer,
  recordJoiningOutcome,
  rejectApplication,
  reportGhosting,
  scheduleInterview,
  updateInterviewStatus,
} from "@/actions/recruiter";
import { ActionForm } from "@/components/action-form";
import { CandidateSignals } from "@/components/candidate-signals";
import { InterviewList } from "@/components/interview-list";
import { ResumeLink } from "@/components/resume-link";
import { ApplicationStatusBadge, ReportStatusBadge } from "@/components/status";
import { Timeline } from "@/components/timeline";
import { Disclosure } from "@/components/disclosure";
import { Card, Chips, DescriptionList, Field, Notice, PageHeader, inlineInputClass, inputClass } from "@/components/ui";
import { requireApprovedRecruiter } from "@/lib/auth";
import { candidateSummaryInclude, summarizeCandidate } from "@/lib/candidate";
import {
  GHOSTING_STAGE_LABEL,
  INTERVIEW_MODE_LABEL,
  MIN_REASON_LENGTH,
  OPEN_APPLICATION_STATUSES,
  READYHIRE_ROOMS,
  REJECTION_CATEGORIES,
  VERIFICATION_METHOD_LABEL,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatLpa, toDateInputValue } from "@/lib/format";
import { responseDueAt } from "@/lib/jobs";

export const metadata: Metadata = { title: "Application" };

export default async function RecruiterApplicationPage({ params }: PageProps<"/recruiter/applications/[id]">) {
  const { id } = await params;
  const { recruiter } = await requireApprovedRecruiter();
  const application = await db.application.findFirst({
    where: { id, job: { recruiterId: recruiter.id } },
    include: {
      job: true,
      candidate: { include: { ...candidateSummaryInclude, resume: true } },
      interviews: { orderBy: { scheduledAt: "asc" } },
      events: {
        include: { actor: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
      ghostingReports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!application) notFound();

  const { candidate, job } = application;
  const summary = summarizeCandidate(candidate);
  const status = application.status;
  const isOpen = OPEN_APPLICATION_STATUSES.includes(status);
  const due = responseDueAt(application.createdAt);
  const overdue = status === "APPLIED" && due < new Date();

  return (
    <>
      <PageHeader
        title={candidate.user.name}
        description={`Applied for ${job.title} on ${formatDate(application.createdAt)}`}
        back={{ href: "/recruiter/applications", label: "Applications" }}
        actions={<ApplicationStatusBadge status={status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-6">
          {status === "APPLIED" && (
            <Card
              title="Response required"
              description="Accept with a message or reject with a reason. The candidate sees exactly what you write."
              className={overdue ? "border-rose-300" : "border-amber-300"}
            >
              <Notice tone={overdue ? "red" : "amber"}>
                {overdue ? "Overdue — was due" : "Due by"} {formatDateTime(due)}.
              </Notice>
              {application.coverNote && (
                <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Candidate&apos;s note</p>
                  <p className="mt-1 whitespace-pre-line text-slate-700">{application.coverNote}</p>
                </div>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 p-4">
                  <p className="mb-3 font-medium text-emerald-800">Accept</p>
                  <ActionForm action={acceptApplication} submitLabel="Accept application">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <Field
                      label="Message to the candidate"
                      htmlFor="accept-message"
                      hint="Next steps, e.g. the first interview round."
                    >
                      <textarea
                        id="accept-message"
                        name="message"
                        rows={4}
                        required
                        minLength={MIN_REASON_LENGTH}
                        className={inputClass}
                      />
                    </Field>
                  </ActionForm>
                </div>
                <div className="rounded-lg border border-rose-200 p-4">
                  <p className="mb-3 font-medium text-rose-800">Reject</p>
                  <RejectForm applicationId={application.id} />
                </div>
              </div>
            </Card>
          )}

          {(status === "ACCEPTED" || status === "INTERVIEWING") && (
            <Card title="Next step" description="Schedule interviews on Readyhire, then extend an offer.">
              <div className="space-y-3">
                <Disclosure
                  summary="Schedule an interview"
                  tone="primary"
                  defaultOpen={application.interviews.length === 0}
                >
                  <ActionForm action={scheduleInterview} submitLabel="Schedule interview" resetOnSuccess>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Round" htmlFor="round">
                        <input
                          id="round"
                          name="round"
                          required
                          placeholder="Technical round 1"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Date & time (IST)" htmlFor="scheduledAt">
                        <input
                          id="scheduledAt"
                          name="scheduledAt"
                          type="datetime-local"
                          required
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Duration (minutes)" htmlFor="durationMins">
                        <input
                          id="durationMins"
                          name="durationMins"
                          type="number"
                          min={15}
                          max={480}
                          defaultValue={45}
                          required
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Mode" htmlFor="mode">
                        <select id="mode" name="mode" defaultValue="VIDEO" className={inputClass}>
                          {Object.entries(INTERVIEW_MODE_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        label="Meeting link or address"
                        htmlFor="location"
                        hint="For video, phone or office interviews."
                      >
                        <input id="location" name="location" className={inputClass} />
                      </Field>
                      <Field
                        label="Readyhire room"
                        htmlFor="room"
                        hint="Controlled room near the candidate — reduces malpractice."
                      >
                        <select id="room" name="room" defaultValue="" className={inputClass}>
                          <option value="">Not using a room</option>
                          {READYHIRE_ROOMS.map((room) => (
                            <option key={room}>{room}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Notes for the candidate" htmlFor="notes">
                      <textarea id="notes" name="notes" rows={2} className={inputClass} />
                    </Field>
                  </ActionForm>
                </Disclosure>
                <Disclosure summary="Extend an offer">
                  <ActionForm action={extendOffer} submitLabel="Record offer">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Offer CTC (LPA)" htmlFor="offerCtcLpa">
                        <input
                          id="offerCtcLpa"
                          name="offerCtcLpa"
                          type="number"
                          step="0.1"
                          min={0}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Joining date" htmlFor="offerJoiningDate">
                        <input
                          id="offerJoiningDate"
                          name="offerJoiningDate"
                          type="date"
                          required
                          defaultValue={toDateInputValue(summary.notice.availableFrom)}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <Field label="Message (optional)" htmlFor="offer-message">
                      <textarea id="offer-message" name="message" rows={2} className={inputClass} />
                    </Field>
                  </ActionForm>
                </Disclosure>
              </div>
            </Card>
          )}

          {status === "OFFERED" && (
            <Card
              title="Joining outcome"
              description={`Offer: ${formatLpa(application.offerCtcLpa) ?? "CTC not recorded"} · joining ${formatDate(application.offerJoiningDate)}`}
            >
              <ActionForm action={recordJoiningOutcome} submitLabel="Record outcome">
                <input type="hidden" name="applicationId" value={application.id} />
                <fieldset className="flex flex-wrap gap-4 text-sm">
                  <legend className="sr-only">Outcome</legend>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="outcome" value="JOINED" required className="accent-brand-700" /> Joined
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="outcome" value="NOT_JOINED" className="accent-brand-700" /> Did not join
                  </label>
                </fieldset>
                <Field label="Notes" htmlFor="outcome-reason" hint="Required if the candidate did not join.">
                  <textarea id="outcome-reason" name="reason" rows={2} className={inputClass} />
                </Field>
              </ActionForm>
            </Card>
          )}

          {(status === "JOINED" || status === "NOT_JOINED" || status === "REJECTED" || status === "WITHDRAWN") && (
            <Card title="Outcome">
              <DescriptionList
                items={[
                  {
                    label: "Status",
                    value: <ApplicationStatusBadge status={status} />,
                  },
                  {
                    label: "Recorded",
                    value: formatDate(application.outcomeAt ?? application.updatedAt),
                  },
                  ...(status === "REJECTED"
                    ? [
                        {
                          label: "Reason sent to candidate",
                          value: `${application.rejectionCategory}: ${application.rejectionReason}`,
                        },
                      ]
                    : []),
                  ...(status === "NOT_JOINED" ? [{ label: "Notes", value: application.notJoinedReason }] : []),
                  ...(status === "WITHDRAWN"
                    ? [
                        {
                          label: "Candidate's reason",
                          value: application.withdrawnReason,
                        },
                      ]
                    : []),
                ]}
              />
            </Card>
          )}

          <Card title="Interviews">
            <InterviewList
              interviews={application.interviews}
              renderAction={(interview) =>
                interview.status === "SCHEDULED" && isOpen ? (
                  <ActionForm
                    action={updateInterviewStatus}
                    submitLabel="Update"
                    variant="secondary"
                    size="sm"
                    className="flex items-end gap-2 space-y-0"
                  >
                    <input type="hidden" name="interviewId" value={interview.id} />
                    <select
                      name="status"
                      aria-label="Interview outcome"
                      defaultValue="COMPLETED"
                      className={`${inlineInputClass} py-1.5`}
                    >
                      <option value="COMPLETED">Completed</option>
                      <option value="NO_SHOW">No-show</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </ActionForm>
                ) : null
              }
            />
          </Card>

          <Card title="Activity">
            <Timeline events={application.events} />
          </Card>

          <div className="flex flex-wrap gap-3">
            {isOpen && status !== "APPLIED" && (
              <Disclosure summary="Reject at this stage" tone="ghost">
                <RejectForm applicationId={application.id} />
              </Disclosure>
            )}
            {status !== "APPLIED" && (
              <Disclosure summary="Report ghosting" tone="ghost">
                {application.ghostingReports.some((r) => r.status === "OPEN") ? (
                  <p className="text-sm text-slate-600">A report for this application is under review.</p>
                ) : (
                  <ActionForm action={reportGhosting} submitLabel="Submit report" variant="danger" size="sm">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <Field label="What happened?" htmlFor="stage">
                      <select id="stage" name="stage" required defaultValue="" className={inputClass}>
                        <option value="" disabled>
                          Choose one
                        </option>
                        {Object.entries(GHOSTING_STAGE_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Details"
                      htmlFor="details"
                      hint="Dates and attempts to reach the candidate. Reviewed by Readyhire."
                    >
                      <textarea
                        id="details"
                        name="details"
                        rows={3}
                        required
                        minLength={MIN_REASON_LENGTH}
                        className={inputClass}
                      />
                    </Field>
                  </ActionForm>
                )}
              </Disclosure>
            )}
          </div>
          {application.ghostingReports.length > 0 && (
            <Card title="Ghosting reports">
              <ul className="space-y-2 text-sm">
                {application.ghostingReports.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2">
                    <ReportStatusBadge status={r.status} /> {GHOSTING_STAGE_LABEL[r.stage]} · {formatDate(r.createdAt)}
                    {r.resolutionNote && <span className="text-slate-500">— {r.resolutionNote}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Verified summary">
            <CandidateSignals
              summary={summary}
              verifiedAt={candidate.verifiedAt}
              verificationMethodLabel={
                candidate.verificationMethod ? VERIFICATION_METHOD_LABEL[candidate.verificationMethod] : null
              }
              applicationId={application.id}
              recruiterId={recruiter.id}
            />
          </Card>
          <Card title="Profile">
            <div className="space-y-3 text-sm">
              {candidate.headline && <p className="font-medium text-slate-900">{candidate.headline}</p>}
              <p className="text-slate-600">
                {[candidate.currentTitle, candidate.currentCompany].filter(Boolean).join(" at ")}
                {candidate.experienceYears != null && ` · ${candidate.experienceYears} yrs`}
                {candidate.city && ` · ${candidate.city}`}
              </p>
              <Chips
                items={(candidate.skills ?? "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)}
              />
              <p>
                <span className="font-medium text-slate-700">Resume:</span> <ResumeLink resume={candidate.resume} />
              </p>
              {status !== "APPLIED" && status !== "REJECTED" ? (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Contact</p>
                  <p className="text-slate-800">{candidate.user.email}</p>
                  {candidate.phone && <p className="text-slate-800">{candidate.phone}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Contact details are shared once you accept the application.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function RejectForm({ applicationId }: { applicationId: string }) {
  return (
    <ActionForm
      action={rejectApplication}
      submitLabel="Reject application"
      variant="danger"
      confirm="Reject this application? The candidate will see your reason."
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <Field label="Reason" htmlFor={`category-${applicationId}`}>
        <select id={`category-${applicationId}`} name="category" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose a reason
          </option>
          {REJECTION_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field
        label="Explanation for the candidate"
        htmlFor={`reason-${applicationId}`}
        hint={`At least ${MIN_REASON_LENGTH} characters. Be specific and respectful.`}
      >
        <textarea
          id={`reason-${applicationId}`}
          name="reason"
          rows={4}
          required
          minLength={MIN_REASON_LENGTH}
          className={inputClass}
        />
      </Field>
    </ActionForm>
  );
}
