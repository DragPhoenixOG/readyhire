import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { approveCandidate, rejectCandidate, reviewDocument } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { CandidateSignals } from "@/components/candidate-signals";
import { ResumeLink } from "@/components/resume-link";
import { DocumentStatusBadge, OfferStatusBadge, VerificationBadge } from "@/components/status";
import { Disclosure } from "@/components/disclosure";
import { Badge, Card, DescriptionList, Field, Notice, PageHeader, inputClass } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { candidateSummaryInclude, summarizeCandidate } from "@/lib/candidate";
import { DOCUMENT_INFO, MIN_REASON_LENGTH, REQUIRED_DOCUMENTS, VERIFICATION_METHOD_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatLpa, toDateInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "Review candidate" };

type Doc = {
  id: string;
  fileName: string;
  mimeType: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  reviewNote: string | null;
  reviewedAt: Date | null;
  uploadedAt: Date;
  reviewedBy: { name: string } | null;
};

export default async function ReviewCandidatePage({ params }: PageProps<"/admin/verifications/[id]">) {
  const { id } = await params;
  await requireRole("ADMIN");
  const candidate = await db.candidateProfile.findUnique({
    where: { id },
    include: {
      ...candidateSummaryInclude,
      verifiedBy: { select: { name: true } },
      resume: true,
      documents: {
        include: { reviewedBy: { select: { name: true } } },
        orderBy: { uploadedAt: "desc" },
      },
      offers: {
        include: {
          document: { include: { reviewedBy: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!candidate) notFound();

  const summary = summarizeCandidate(candidate);
  const required = REQUIRED_DOCUMENTS.map((type) => ({
    type,
    doc: candidate.documents.find((d) => d.type === type),
  }));
  const allVerified = required.every((r) => r.doc?.status === "VERIFIED");
  const inPersonEligible = candidate.city === "Hyderabad" || candidate.city === "Bengaluru";

  return (
    <>
      <PageHeader
        title={candidate.user.name}
        description={`${candidate.user.email}${candidate.phone ? ` · ${candidate.phone}` : ""}`}
        back={{ href: "/admin/verifications", label: "Verifications" }}
        actions={
          <>
            {candidate.user.flagged && <Badge tone="red">Flagged: {candidate.user.flagReason}</Badge>}
            {candidate.user.status === "RESTRICTED" && <Badge tone="red">Restricted</Badge>}
            <VerificationBadge status={candidate.verificationStatus} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,24rem)]">
        <div className="space-y-6">
          <Card
            title="Declared details"
            description={
              candidate.submittedAt ? `Submitted ${formatDateTime(candidate.submittedAt)}` : "Not submitted yet"
            }
          >
            <DescriptionList
              items={[
                {
                  label: "Current company",
                  value: candidate.currentCompany ?? "—",
                },
                {
                  label: "Current title",
                  value: candidate.currentTitle ?? "—",
                },
                {
                  label: "Notice period",
                  value: candidate.noticePeriodDays != null ? `${candidate.noticePeriodDays} days` : "—",
                },
                {
                  label: "Resignation date",
                  value: formatDate(candidate.resignationDate),
                },
                {
                  label: "Last working day",
                  value: formatDate(candidate.lastWorkingDay),
                },
                {
                  label: "City",
                  value: (
                    <>
                      {candidate.city ?? "—"}{" "}
                      {inPersonEligible && <Badge tone="violet">In-person check available</Badge>}
                    </>
                  ),
                },
                { label: "Resume", value: <ResumeLink resume={candidate.resume} /> },
              ]}
            />
          </Card>

          <Card
            title="Required documents"
            description="Open each file, compare it against the declared details, then verify or reject it."
          >
            <ul className="space-y-5">
              {required.map(({ type, doc }) => (
                <li key={type} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{DOCUMENT_INFO[type].label}</p>
                    {doc ? <DocumentStatusBadge status={doc.status} /> : <Badge>Missing</Badge>}
                  </div>
                  <p className="text-sm text-slate-500">{DOCUMENT_INFO[type].help}</p>
                  {/* Required documents are reviewed as part of a submission; afterwards they're read-only. */}
                  {doc && <DocumentReview doc={doc} canReview={candidate.verificationStatus === "PENDING"} />}
                </li>
              ))}
            </ul>
          </Card>

          <Card
            title="Declared offers"
            description="Offers the candidate holds elsewhere. Verify attached offer letters so recruiters see proof-backed counts."
          >
            {candidate.offers.length === 0 ? (
              <p className="text-sm text-slate-500">No offers declared.</p>
            ) : (
              <ul className="space-y-4">
                {candidate.offers.map((offer) => (
                  <li key={offer.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">
                        {offer.role} · {offer.company}
                      </p>
                      <OfferStatusBadge status={offer.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {[formatLpa(offer.ctcLpa), offer.joiningDate && `joining ${formatDate(offer.joiningDate)}`]
                        .filter(Boolean)
                        .join(" · ") || "No details"}
                    </p>
                    {offer.document ? (
                      <DocumentReview doc={offer.document} canReview />
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">No proof attached.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Decision">
            {candidate.verificationStatus === "PENDING" ? (
              <div className="space-y-4">
                <ul className="space-y-1 text-sm">
                  {required.map(({ type, doc }) => (
                    <li key={type} className="flex items-center justify-between gap-2">
                      <span className="text-slate-700">{DOCUMENT_INFO[type].label}</span>
                      {doc ? <DocumentStatusBadge status={doc.status} /> : <Badge>Missing</Badge>}
                    </li>
                  ))}
                </ul>
                {!allVerified && <Notice tone="amber">Verify all three documents before approving.</Notice>}
                <ActionForm action={approveCandidate} submitLabel="Approve & list candidate">
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <Field label="Verification method" htmlFor="method">
                    <select id="method" name="method" defaultValue="DOCUMENT_REVIEW" className={inputClass}>
                      {Object.entries(VERIFICATION_METHOD_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Confirmed notice (days)" htmlFor="noticePeriodDays">
                      <input
                        id="noticePeriodDays"
                        name="noticePeriodDays"
                        type="number"
                        min={0}
                        max={180}
                        required
                        defaultValue={candidate.noticePeriodDays ?? ""}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Confirmed last working day" htmlFor="lastWorkingDay">
                      <input
                        id="lastWorkingDay"
                        name="lastWorkingDay"
                        type="date"
                        required
                        defaultValue={toDateInputValue(candidate.lastWorkingDay)}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <Field
                    label="Internal notes"
                    htmlFor="notes"
                    hint="Screen-share or door-check observations. Not shown to candidates or recruiters."
                  >
                    <textarea id="notes" name="notes" rows={3} className={inputClass} />
                  </Field>
                </ActionForm>
                <Disclosure summary="Send back to candidate" tone="ghost">
                  <ActionForm action={rejectCandidate} submitLabel="Reject verification" variant="danger" size="sm">
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <Field label="What should the candidate fix?" htmlFor="reject-reason">
                      <textarea
                        id="reject-reason"
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
            ) : candidate.verificationStatus === "VERIFIED" ? (
              <div className="space-y-4 text-sm">
                <DescriptionList
                  items={[
                    {
                      label: "Verified",
                      value: formatDateTime(candidate.verifiedAt),
                    },
                    { label: "By", value: candidate.verifiedBy?.name ?? "—" },
                    {
                      label: "Method",
                      value: candidate.verificationMethod
                        ? VERIFICATION_METHOD_LABEL[candidate.verificationMethod]
                        : "—",
                    },
                  ]}
                />
                {candidate.verificationNotes && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                    <span className="font-medium">Internal notes:</span> {candidate.verificationNotes}
                  </p>
                )}
                <Disclosure summary="Revoke verification" tone="ghost">
                  <ActionForm
                    action={rejectCandidate}
                    submitLabel="Revoke & delist"
                    variant="danger"
                    size="sm"
                    confirm="The candidate will be hidden from recruiters. Continue?"
                  >
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <Field label="Reason (shown to the candidate)" htmlFor="revoke-reason">
                      <textarea
                        id="revoke-reason"
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
            ) : (
              <p className="text-sm text-slate-600">
                {candidate.verificationStatus === "REJECTED"
                  ? `Sent back: ${candidate.rejectionReason ?? "—"}. Waiting for the candidate to resubmit.`
                  : "The candidate hasn't submitted for verification yet."}
              </p>
            )}
          </Card>

          <Card title="Signals recruiters see">
            <CandidateSignals summary={summary} verifiedAt={candidate.verifiedAt} />
          </Card>
        </div>
      </div>
    </>
  );
}

function DocumentReview({ doc, canReview }: { doc: Doc; canReview: boolean }) {
  const url = `/api/documents/${doc.id}`;
  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm">
        <a href={url} target="_blank" className="font-medium text-brand-700 hover:underline">
          {doc.fileName}
        </a>{" "}
        <span className="text-slate-500">· uploaded {formatDate(doc.uploadedAt)}</span>
      </p>
      <details className="rounded-lg border border-slate-200">
        <summary className="cursor-pointer px-3 py-2 text-sm text-slate-600">Preview</summary>
        {doc.mimeType === "application/pdf" ? (
          <iframe src={url} title={doc.fileName} className="h-96 w-full border-t border-slate-200" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated file
          <img src={url} alt={doc.fileName} className="max-h-96 w-full border-t border-slate-200 object-contain" />
        )}
      </details>
      {doc.reviewedAt && (
        <p className="text-xs text-slate-500">
          Reviewed {formatDateTime(doc.reviewedAt)}
          {doc.reviewedBy && ` by ${doc.reviewedBy.name}`}
          {doc.reviewNote && ` — ${doc.reviewNote}`}
        </p>
      )}
      {canReview && (
        <ActionForm
          action={reviewDocument}
          submitLabel="Save review"
          variant="secondary"
          size="sm"
          className="space-y-2"
        >
          <input type="hidden" name="documentId" value={doc.id} />
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="sr-only">Decision</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="decision"
                value="VERIFIED"
                required
                defaultChecked={doc.status === "VERIFIED"}
                className="accent-brand-700"
              />
              Verified
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="decision"
                value="REJECTED"
                defaultChecked={doc.status === "REJECTED"}
                className="accent-rose-600"
              />
              Reject
            </label>
          </fieldset>
          <input
            name="note"
            placeholder="Note (required when rejecting)"
            defaultValue={doc.reviewNote ?? ""}
            aria-label="Review note"
            className={inputClass}
          />
        </ActionForm>
      )}
    </div>
  );
}
