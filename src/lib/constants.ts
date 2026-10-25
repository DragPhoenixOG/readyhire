import type {
  ApplicationStatus,
  ApprovalStatus,
  DocumentStatus,
  DocumentType,
  GhostingStage,
  InterviewMode,
  InterviewStatus,
  OfferStatus,
  ReportStatus,
  VerificationMethod,
  VerificationStatus,
  WorkMode,
} from "@/generated/prisma/enums";

export const APP_TIMEZONE = "Asia/Kolkata";

/** Recruiters must accept or reject every application within this window. */
export const RESPONSE_SLA_HOURS = 72;

export const MIN_REASON_LENGTH = 15;

export const CITIES = ["Hyderabad", "Bengaluru", "Chennai", "Pune", "Mumbai", "Delhi NCR", "Other"] as const;

export const REQUIRED_DOCUMENTS: DocumentType[] = ["OFFER_LETTER", "NOTICE_POLICY", "RESIGNATION_PROOF"];

export const DOCUMENT_INFO: Record<DocumentType, { label: string; help: string }> = {
  OFFER_LETTER: {
    label: "Current offer letter",
    help: "Offer or appointment letter from your current employer. Establishes your role and notice clause.",
  },
  NOTICE_POLICY: {
    label: "Notice period policy",
    help: "HR policy page or contract clause that states your notice period.",
  },
  RESIGNATION_PROOF: {
    label: "Resignation evidence",
    help: "Resignation email with your manager's or HR's acknowledgement showing the resignation date.",
  },
  OTHER_OFFER: {
    label: "Other offer",
    help: "Offer letter from another company you currently hold.",
  },
};

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  NOT_SUBMITTED: "Not submitted",
  PENDING: "Pending review",
  VERIFIED: "Verified",
  REJECTED: "Changes needed",
};

export const VERIFICATION_METHOD_LABEL: Record<VerificationMethod, string> = {
  DOCUMENT_REVIEW: "Document review",
  SCREEN_SHARE: "Screen-share check",
  IN_PERSON: "In-person / door check",
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  PENDING: "Awaiting review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  HOLDING: "Holding (undecided)",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

/** Offers that still count as "active" for offer-shopping visibility. */
export const ACTIVE_OFFER_STATUSES: OfferStatus[] = ["HOLDING", "ACCEPTED"];

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "Awaiting response",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  INTERVIEWING: "Interviewing",
  OFFERED: "Offer extended",
  JOINED: "Joined",
  NOT_JOINED: "Did not join",
  WITHDRAWN: "Withdrawn",
};

/** Statuses where the application is still moving. */
export const OPEN_APPLICATION_STATUSES: ApplicationStatus[] = ["APPLIED", "ACCEPTED", "INTERVIEWING", "OFFERED"];

/** Statuses a candidate may commit to: the recruiter has said yes and nothing is final yet. */
export const COMMITTABLE_STATUSES: ApplicationStatus[] = ["ACCEPTED", "INTERVIEWING", "OFFERED"];

export const REJECTION_CATEGORIES = [
  "Skills don't match the role",
  "Experience level doesn't match",
  "Joining timeline doesn't fit",
  "Compensation expectations don't align",
  "Position filled or on hold",
  "Interview feedback",
  "Other",
] as const;

export const INTERVIEW_MODE_LABEL: Record<InterviewMode, string> = {
  VIDEO: "Video call",
  PHONE: "Phone",
  IN_PERSON: "In person (office)",
  READYHIRE_ROOM: "Readyhire interview room",
};

export const INTERVIEW_STATUS_LABEL: Record<InterviewStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

/** Controlled interview rooms near candidates. */
export const READYHIRE_ROOMS = [
  "HITEC City, Hyderabad",
  "Gachibowli, Hyderabad",
  "Whitefield, Bengaluru",
  "Koramangala, Bengaluru",
  "Manyata Tech Park, Bengaluru",
];

export const GHOSTING_STAGE_LABEL: Record<GhostingStage, string> = {
  INTERVIEW_NO_SHOW: "Skipped a scheduled interview",
  OFFER_NO_RESPONSE: "Stopped responding after the offer",
  DID_NOT_JOIN: "Did not show up on joining day",
  OTHER: "Other",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: "Open",
  UPHELD: "Upheld",
  DISMISSED: "Dismissed",
};

/** Public / free mailbox providers that can't be used for recruiter sign-up. */
export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.in",
  "ymail.com",
  "rocketmail.com",
  "outlook.com",
  "outlook.in",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "zohomail.com",
  "zohomail.in",
  "rediffmail.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "yandex.com",
  "tutanota.com",
  "fastmail.com",
  "hey.com",
  "inbox.com",
  "qq.com",
  "163.com",
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "sharklasers.com",
]);
