import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { InterviewStatusBadge } from "@/components/status";
import type { InterviewMode, InterviewStatus } from "@/generated/prisma/enums";
import { INTERVIEW_MODE_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

type InterviewItem = {
  id: string;
  round: string;
  scheduledAt: Date;
  durationMins: number;
  mode: InterviewMode;
  location: string | null;
  notes: string | null;
  status: InterviewStatus;
  candidateConfirmed: boolean;
};

export function InterviewList<T extends InterviewItem>({
  interviews,
  renderAction,
}: {
  interviews: T[];
  renderAction?: (interview: T) => ReactNode;
}) {
  if (interviews.length === 0) return <p className="text-sm text-slate-500">No interviews scheduled yet.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {interviews.map((interview) => (
        <li key={interview.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 space-y-1 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
              {interview.round} <InterviewStatusBadge status={interview.status} />
              {interview.status === "SCHEDULED" &&
                (interview.candidateConfirmed ? (
                  <Badge tone="green">Candidate confirmed</Badge>
                ) : (
                  <Badge tone="neutral">Not yet confirmed</Badge>
                ))}
            </p>
            <p className="text-slate-600">
              {formatDateTime(interview.scheduledAt)} · {interview.durationMins} min ·{" "}
              {INTERVIEW_MODE_LABEL[interview.mode]}
            </p>
            {interview.location && (
              <p className="break-all text-slate-600">
                {/^https?:\/\//.test(interview.location) ? (
                  <a
                    href={interview.location}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    {interview.location}
                  </a>
                ) : (
                  interview.location
                )}
              </p>
            )}
            {interview.notes && <p className="whitespace-pre-line text-slate-500">{interview.notes}</p>}
          </div>
          {renderAction?.(interview)}
        </li>
      ))}
    </ul>
  );
}
