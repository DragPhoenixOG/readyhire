import Link from "next/link";
import { CommitmentBadge, OffersBadge, joinabilityLabel } from "@/components/candidate-signals";
import { ApplicationStatusBadge } from "@/components/status";
import { Badge, Table, Td } from "@/components/ui";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { type CandidateWithSummary, summarizeCandidate } from "@/lib/candidate";
import { formatDate, formatHours, hoursSince } from "@/lib/format";
import { responseDueAt } from "@/lib/jobs";

type Row = {
  id: string;
  status: ApplicationStatus;
  createdAt: Date;
  respondedAt: Date | null;
  job: { title: string };
  candidate: CandidateWithSummary;
};

export function RecruiterApplicationsTable({
  applications,
  recruiterId,
  showJob = true,
}: {
  applications: Row[];
  recruiterId: string;
  showJob?: boolean;
}) {
  const now = new Date();
  return (
    <Table head={["Candidate", ...(showJob ? ["Job"] : []), "Applied", "Status", "Response", "Joining", "Offers & commitment"]}>
      {applications.map((a) => {
        const summary = summarizeCandidate(a.candidate, now);
        const due = responseDueAt(a.createdAt);
        return (
          <tr key={a.id} className="hover:bg-slate-50">
            <Td>
              <Link href={`/recruiter/applications/${a.id}`} className="font-medium text-slate-900 hover:underline">
                {a.candidate.user.name}
              </Link>
              <p className="text-xs text-slate-500">{a.candidate.headline ?? a.candidate.currentTitle ?? ""}</p>
            </Td>
            {showJob && <Td>{a.job.title}</Td>}
            <Td className="whitespace-nowrap">{formatDate(a.createdAt)}</Td>
            <Td>
              <ApplicationStatusBadge status={a.status} />
            </Td>
            <Td className="whitespace-nowrap">
              {a.status === "APPLIED" ? (
                due < now ? (
                  <Badge tone="red">Overdue {formatHours(hoursSince(due, now))}</Badge>
                ) : (
                  <Badge tone="amber">Due in {formatHours(-hoursSince(due, now))}</Badge>
                )
              ) : a.respondedAt ? (
                <span className="text-xs text-slate-500">Replied in {formatHours(hoursSince(a.createdAt, a.respondedAt))}</span>
              ) : (
                "—"
              )}
            </Td>
            <Td className="whitespace-nowrap text-xs">{joinabilityLabel(summary.notice)}</Td>
            <Td>
              <div className="flex flex-wrap gap-1.5">
                <OffersBadge summary={summary} />
                <CommitmentBadge summary={summary} applicationId={a.id} recruiterId={recruiterId} />
              </div>
            </Td>
          </tr>
        );
      })}
    </Table>
  );
}
