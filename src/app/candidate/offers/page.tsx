import type { Metadata } from "next";
import { addOffer, updateOffer } from "@/actions/candidate";
import { ActionForm } from "@/components/action-form";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentStatusBadge, OfferStatusBadge } from "@/components/status";
import { Card, EmptyState, Field, PageHeader, StatCard, inputClass } from "@/components/ui";
import { requireCandidate } from "@/lib/auth";
import { ACTIVE_OFFER_STATUSES, OFFER_STATUS_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatLpa, toDateInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "My offers" };

export default async function OffersPage() {
  const { profile } = await requireCandidate();
  const [offers, platformOffers] = await Promise.all([
    db.offer.findMany({
      where: { candidateId: profile.id },
      include: { document: true },
      orderBy: { createdAt: "desc" },
    }),
    db.application.count({ where: { candidateId: profile.id, status: "OFFERED" } }),
  ]);
  const active = offers.filter((o) => ACTIVE_OFFER_STATUSES.includes(o.status));

  return (
    <>
      <PageHeader
        title="My offers"
        description="Recruiters see how many active offers you hold. Keeping this accurate is part of the Readyhire terms."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active offers you declared" value={active.length} tone={active.length ? "amber" : "neutral"} />
        <StatCard label="Offers via Readyhire" value={platformOffers} hint="Counted automatically" />
        <StatCard label="Total visible to recruiters" value={active.length + platformOffers} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-4">
          {offers.length === 0 ? (
            <EmptyState
              title="No offers declared"
              description="If you hold offers from other companies, add them here. Attaching the offer letter lets Readyhire verify it."
            />
          ) : (
            offers.map((offer) => (
              <Card
                key={offer.id}
                title={`${offer.role} · ${offer.company}`}
                description={[
                  formatLpa(offer.ctcLpa),
                  offer.offeredOn && `offered ${formatDate(offer.offeredOn)}`,
                  offer.joiningDate && `joining ${formatDate(offer.joiningDate)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                actions={<OfferStatusBadge status={offer.status} />}
              >
                <p className="mb-3 text-sm text-slate-600">
                  Proof:{" "}
                  {offer.document ? (
                    <>
                      <a href={`/api/documents/${offer.document.id}`} target="_blank" className="font-medium text-brand-700 hover:underline">
                        {offer.document.fileName}
                      </a>{" "}
                      <DocumentStatusBadge status={offer.document.status} />
                    </>
                  ) : (
                    "not attached"
                  )}
                </p>
                <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,16rem)]">
                <ActionForm action={updateOffer} submitLabel="Update offer" variant="secondary" size="sm">
                  <input type="hidden" name="offerId" value={offer.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Status" htmlFor={`status-${offer.id}`}>
                      <select id={`status-${offer.id}`} name="status" defaultValue={offer.status} className={inputClass}>
                        {Object.entries(OFFER_STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Joining date" htmlFor={`joining-${offer.id}`}>
                      <input
                        id={`joining-${offer.id}`}
                        name="joiningDate"
                        type="date"
                        defaultValue={toDateInputValue(offer.joiningDate)}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </ActionForm>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-800">{offer.document ? "Replace offer letter" : "Attach offer letter"}</p>
                  <DocumentUploader
                    target={{ kind: "offer", offerId: offer.id }}
                    label={`Offer letter from ${offer.company}`}
                    submitLabel={offer.document ? "Replace" : "Attach"}
                    variant="secondary"
                  />
                </div>
                </div>
              </Card>
            ))
          )}
          <p className="text-xs text-slate-500">Offers can&apos;t be deleted — mark them declined or expired instead.</p>
        </div>

        <Card title="Add an offer">
          <ActionForm action={addOffer} submitLabel="Add offer" resetOnSuccess>
            <Field label="Company" htmlFor="company">
              <input id="company" name="company" required className={inputClass} />
            </Field>
            <Field label="Role" htmlFor="role">
              <input id="role" name="role" required className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CTC (LPA)" htmlFor="ctcLpa">
                <input id="ctcLpa" name="ctcLpa" type="number" step="0.1" min={0} className={inputClass} />
              </Field>
              <Field label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue="HOLDING" className={inputClass}>
                  {Object.entries(OFFER_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Offered on" htmlFor="offeredOn">
                <input id="offeredOn" name="offeredOn" type="date" className={inputClass} />
              </Field>
              <Field label="Joining date" htmlFor="joiningDate">
                <input id="joiningDate" name="joiningDate" type="date" className={inputClass} />
              </Field>
            </div>
            <p className="text-xs text-slate-500">After adding it, attach the offer letter so Readyhire can mark the offer as verified.</p>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
