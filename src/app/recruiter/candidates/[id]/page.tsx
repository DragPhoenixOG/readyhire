import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateSignals } from "@/components/candidate-signals";
import { ApplicationStatusBadge } from "@/components/status";
import { Card, Chips, DescriptionList, PageHeader } from "@/components/ui";
import { requireApprovedRecruiter } from "@/lib/auth";
import { candidateSummaryInclude, listableCandidateWhere, summarizeCandidate } from "@/lib/candidate";
import { VERIFICATION_METHOD_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, splitList } from "@/lib/format";

export const metadata: Metadata = { title: "Candidate" };

export default async function RecruiterCandidatePage({ params }: PageProps<"/recruiter/candidates/[id]">) {
  const { id } = await params;
  const { recruiter } = await requireApprovedRecruiter();
  // Recruiters can open listable candidates, plus anyone who applied to their jobs.
  const candidate = await db.candidateProfile.findFirst({
    where: {
      id,
      OR: [listableCandidateWhere, { applications: { some: { job: { recruiterId: recruiter.id } } } }],
    },
    include: candidateSummaryInclude,
  });
  if (!candidate) notFound();

  const summary = summarizeCandidate(candidate);
  const withMe = await db.application.findMany({
    where: { candidateId: candidate.id, job: { recruiterId: recruiter.id } },
    include: { job: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title={candidate.user.name}
        description={candidate.headline ?? undefined}
        back={{ href: "/recruiter/candidates", label: "Verified talent" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-6">
          <Card title="Profile">
            <DescriptionList
              items={[
                {
                  label: "Current role",
                  value: [candidate.currentTitle, candidate.currentCompany].filter(Boolean).join(" at ") || "—",
                },
                {
                  label: "Experience",
                  value: candidate.experienceYears != null ? `${candidate.experienceYears} years` : "—",
                },
                { label: "City", value: candidate.city ?? "—" },
                {
                  label: "On Readyhire since",
                  value: formatDate(candidate.createdAt),
                },
              ]}
            />
            <div className="mt-4">
              <Chips items={splitList(candidate.skills)} />
            </div>
          </Card>
          <Card title="Applications to your jobs">
            {withMe.length === 0 ? (
              <p className="text-sm text-slate-500">
                This candidate hasn&apos;t applied to your jobs yet. Candidates apply to roles themselves — keep your
                job posts specific about the joining window.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {withMe.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link
                      href={`/recruiter/applications/${a.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {a.job.title}
                    </Link>
                    <ApplicationStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title="Verified summary">
          <CandidateSignals
            summary={summary}
            verifiedAt={candidate.verifiedAt}
            verificationMethodLabel={
              candidate.verificationMethod ? VERIFICATION_METHOD_LABEL[candidate.verificationMethod] : null
            }
            recruiterId={recruiter.id}
          />
        </Card>
      </div>
    </>
  );
}
