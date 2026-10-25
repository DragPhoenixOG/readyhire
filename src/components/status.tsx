import type {
  ApplicationStatus,
  ApprovalStatus,
  DocumentStatus,
  InterviewStatus,
  OfferStatus,
  ReportStatus,
  VerificationStatus,
} from "@/generated/prisma/enums";
import { Badge, type Tone } from "@/components/ui";
import {
  APPLICATION_STATUS_LABEL,
  APPROVAL_STATUS_LABEL,
  DOCUMENT_STATUS_LABEL,
  INTERVIEW_STATUS_LABEL,
  OFFER_STATUS_LABEL,
  REPORT_STATUS_LABEL,
  VERIFICATION_STATUS_LABEL,
} from "@/lib/constants";

const verificationTone: Record<VerificationStatus, Tone> = {
  NOT_SUBMITTED: "neutral",
  PENDING: "amber",
  VERIFIED: "green",
  REJECTED: "red",
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <Badge tone={verificationTone[status]}>
      {status === "VERIFIED" && <CheckIcon />}
      {VERIFICATION_STATUS_LABEL[status]}
    </Badge>
  );
}

const documentTone: Record<DocumentStatus, Tone> = {
  PENDING: "amber",
  VERIFIED: "green",
  REJECTED: "red",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge tone={documentTone[status]}>{DOCUMENT_STATUS_LABEL[status]}</Badge>;
}

export const applicationTone: Record<ApplicationStatus, Tone> = {
  APPLIED: "amber",
  ACCEPTED: "blue",
  REJECTED: "red",
  INTERVIEWING: "violet",
  OFFERED: "blue",
  JOINED: "green",
  NOT_JOINED: "red",
  WITHDRAWN: "neutral",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={applicationTone[status]}>{APPLICATION_STATUS_LABEL[status]}</Badge>;
}

const approvalTone: Record<ApprovalStatus, Tone> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return <Badge tone={approvalTone[status]}>{APPROVAL_STATUS_LABEL[status]}</Badge>;
}

const offerTone: Record<OfferStatus, Tone> = {
  HOLDING: "amber",
  ACCEPTED: "blue",
  DECLINED: "neutral",
  EXPIRED: "neutral",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <Badge tone={offerTone[status]}>{OFFER_STATUS_LABEL[status]}</Badge>;
}

const interviewTone: Record<InterviewStatus, Tone> = {
  SCHEDULED: "blue",
  COMPLETED: "green",
  CANCELLED: "neutral",
  NO_SHOW: "red",
};

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return <Badge tone={interviewTone[status]}>{INTERVIEW_STATUS_LABEL[status]}</Badge>;
}

const reportTone: Record<ReportStatus, Tone> = {
  OPEN: "amber",
  UPHELD: "red",
  DISMISSED: "neutral",
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Badge tone={reportTone[status]}>{REPORT_STATUS_LABEL[status]}</Badge>;
}

export function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
