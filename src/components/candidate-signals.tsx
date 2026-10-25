import { Badge } from "@/components/ui";
import type { CandidateSummary } from "@/lib/candidate";
import { formatDate } from "@/lib/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function joinabilityLabel(notice: CandidateSummary["notice"]) {
  if (notice.daysToLastWorkingDay == null) return "Unknown";
  if (notice.daysToLastWorkingDay < 0) return "Available now";
  return `Can join in ${notice.daysToLastWorkingDay + 1} days`;
}

export function CommitmentBadge({
  summary,
  applicationId,
  recruiterId,
}: {
  summary: CandidateSummary;
  /** The application being viewed, if any. */
  applicationId?: string;
  /** The viewing recruiter, if any. */
  recruiterId?: string;
}) {
  if (summary.joined) return <Badge tone="green">Joined {summary.joined.companyName}</Badge>;
  if (!summary.commitment) return <Badge tone="neutral">Not committed</Badge>;
  if (applicationId && summary.commitment.applicationId === applicationId) {
    return <Badge tone="green">Committed to this role</Badge>;
  }
  if (recruiterId && summary.commitment.recruiterId === recruiterId) {
    return <Badge tone="blue">Committed to your {summary.commitment.jobTitle} role</Badge>;
  }
  return <Badge tone="amber">Committed to another role</Badge>;
}

export function OffersBadge({ summary }: { summary: CandidateSummary }) {
  return (
    <Badge tone={summary.activeOffers === 0 ? "green" : summary.activeOffers === 1 ? "amber" : "red"}>
      {summary.activeOffers} active offer{summary.activeOffers === 1 ? "" : "s"}
    </Badge>
  );
}

/** The verified notice summary and offer-shopping / reliability signals for one candidate. */
export function CandidateSignals({
  summary,
  verifiedAt,
  verificationMethodLabel,
  applicationId,
  recruiterId,
}: {
  summary: CandidateSummary;
  verifiedAt?: Date | null;
  verificationMethodLabel?: string | null;
  applicationId?: string;
  recruiterId?: string;
}) {
  const { notice } = summary;
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
        {notice.verified ? (
          <>
            <p className="font-semibold">Notice period verified</p>
            <p className="text-emerald-800">
              {verifiedAt && `Verified ${formatDate(verifiedAt)}`}
              {verificationMethodLabel && ` · ${verificationMethodLabel}`}
            </p>
          </>
        ) : (
          <p className="font-semibold text-amber-900">Notice period not currently verified</p>
        )}
      </div>
      <dl className="divide-y divide-slate-100">
        <Row label="Notice period">{notice.days != null ? `${notice.days} days` : "—"}</Row>
        <Row label="Resigned on">{formatDate(notice.resignationDate)}</Row>
        <Row label="Last working day">{formatDate(notice.lastWorkingDay)}</Row>
        <Row label="Joining">{joinabilityLabel(notice)}</Row>
        <Row label="Active offers">
          <OffersBadge summary={summary} />
          <p className="mt-1 text-xs font-normal text-slate-500">
            {summary.externalActiveOffers} declared ({summary.proofVerifiedOffers} with verified proof) ·{" "}
            {summary.platformOffers} via Readyhire
          </p>
        </Row>
        <Row label="Commitment">
          <CommitmentBadge summary={summary} applicationId={applicationId} recruiterId={recruiterId} />
        </Row>
        <Row label="Commitments released">{summary.releases}</Row>
        <Row label="Upheld ghosting reports">
          {summary.upheldGhosting > 0 ? <Badge tone="red">{summary.upheldGhosting}</Badge> : "0"}
        </Row>
      </dl>
    </div>
  );
}
