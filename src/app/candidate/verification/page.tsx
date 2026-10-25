import type { Metadata } from "next";
import Link from "next/link";
import { reopenVerification, saveNoticeDetails, submitForVerification } from "@/actions/candidate";
import { ActionForm } from "@/components/action-form";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentStatusBadge, VerificationBadge } from "@/components/status";
import { Card, DescriptionList, Field, Notice, PageHeader, inputClass } from "@/components/ui";
import { requireCandidate } from "@/lib/auth";
import { DOCUMENT_INFO, REQUIRED_DOCUMENTS, VERIFICATION_METHOD_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, toDateInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "Verification" };

export default async function VerificationPage() {
  const { profile } = await requireCandidate();
  const documents = await db.document.findMany({
    where: { candidateId: profile.id, type: { in: REQUIRED_DOCUMENTS } },
    orderBy: { uploadedAt: "desc" },
  });
  const status = profile.verificationStatus;
  const editable = status === "NOT_SUBMITTED" || status === "REJECTED";

  return (
    <>
      <PageHeader
        title="Verification"
        description="Readyhire verifies your notice period, resignation and current offer before recruiters can see you."
        actions={<VerificationBadge status={status} />}
      />

      <div className="space-y-6">
        {status === "VERIFIED" && (
          <Notice tone="green" title="You're verified and visible to recruiters">
            Verified {formatDate(profile.verifiedAt)}
            {profile.verificationMethod &&
              ` via ${VERIFICATION_METHOD_LABEL[profile.verificationMethod].toLowerCase()}`}
            . Recruiters see your notice period, last working day, active offers and commitment status.
          </Notice>
        )}
        {status === "PENDING" && (
          <Notice tone="blue" title="Under review">
            Submitted {formatDateTime(profile.submittedAt)}. The team may contact you for a screen-share or in-person
            check (available in Hyderabad and Bengaluru).
          </Notice>
        )}
        {status === "REJECTED" && (
          <Notice tone="red" title="Changes needed">
            {profile.rejectionReason ?? "Please review the notes on each document, update them and submit again."}
          </Notice>
        )}

        <Card title="1. Notice details" description="These must match your resignation evidence and notice policy.">
          {editable ? (
            <ActionForm action={saveNoticeDetails} submitLabel="Save notice details">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Notice period (days)" htmlFor="noticePeriodDays">
                  <input
                    id="noticePeriodDays"
                    name="noticePeriodDays"
                    type="number"
                    min={0}
                    max={180}
                    required
                    defaultValue={profile.noticePeriodDays ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Resignation date" htmlFor="resignationDate">
                  <input
                    id="resignationDate"
                    name="resignationDate"
                    type="date"
                    required
                    defaultValue={toDateInputValue(profile.resignationDate)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Last working day" htmlFor="lastWorkingDay">
                  <input
                    id="lastWorkingDay"
                    name="lastWorkingDay"
                    type="date"
                    required
                    defaultValue={toDateInputValue(profile.lastWorkingDay)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </ActionForm>
          ) : (
            <DescriptionList
              items={[
                {
                  label: "Notice period",
                  value: `${profile.noticePeriodDays} days`,
                },
                {
                  label: "Resignation date",
                  value: formatDate(profile.resignationDate),
                },
                {
                  label: "Last working day",
                  value: formatDate(profile.lastWorkingDay),
                },
                {
                  label: "Current company",
                  value: profile.currentCompany ?? "—",
                },
              ]}
            />
          )}
          {editable && !profile.currentCompany && (
            <p className="mt-3 text-sm text-amber-700">
              Also add your current company on the{" "}
              <Link href="/candidate/profile" className="font-medium underline">
                Profile
              </Link>{" "}
              page.
            </p>
          )}
        </Card>

        <Card
          title="2. Documents"
          description="PDF, PNG, JPG or WebP, up to 5 MB each. Only the Readyhire team can view them."
        >
          <ul className="divide-y divide-slate-100">
            {REQUIRED_DOCUMENTS.map((type) => {
              const doc = documents.find((d) => d.type === type);
              return (
                <li key={type} className="grid gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_minmax(0,20rem)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{DOCUMENT_INFO[type].label}</p>
                      {doc ? (
                        <DocumentStatusBadge status={doc.status} />
                      ) : (
                        <span className="text-xs text-slate-500">Not uploaded</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{DOCUMENT_INFO[type].help}</p>
                    {doc && (
                      <p className="mt-2 text-sm">
                        <a
                          href={`/api/documents/${doc.id}`}
                          target="_blank"
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {doc.fileName}
                        </a>{" "}
                        <span className="text-slate-500">· uploaded {formatDate(doc.uploadedAt)}</span>
                      </p>
                    )}
                    {doc?.reviewNote && (
                      <p className="mt-1 text-sm text-slate-700">
                        <span className="font-medium">Reviewer note:</span> {doc.reviewNote}
                      </p>
                    )}
                  </div>
                  {editable && (
                    <DocumentUploader
                      target={{ kind: "required", type }}
                      label={`${DOCUMENT_INFO[type].label} file`}
                      submitLabel={doc ? "Replace file" : "Upload"}
                      variant={doc ? "secondary" : "primary"}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {editable ? (
          <Card
            title="3. Submit for verification"
            description="You can't change notice details or documents while the review is in progress."
          >
            {/* Re-mount when the inputs change so an earlier "missing X" error doesn't linger. */}
            <ActionForm
              key={`${profile.updatedAt.getTime()}-${documents.map((d) => d.id).join()}`}
              action={submitForVerification}
              submitLabel="Submit for verification"
              pendingLabel="Submitting…"
            />
          </Card>
        ) : (
          <Card
            title="Need to change something?"
            description="If your last working day changed or a document needs replacing, reopen verification. Your profile is hidden from recruiters until it's verified again."
          >
            <ActionForm
              action={reopenVerification}
              submitLabel="Reopen verification"
              variant="secondary"
              confirm="Your profile will be hidden from recruiters until it is verified again. Continue?"
            />
          </Card>
        )}
      </div>
    </>
  );
}
