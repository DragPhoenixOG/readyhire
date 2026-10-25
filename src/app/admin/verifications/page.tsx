import type { Metadata } from "next";
import Link from "next/link";
import { DocumentStatusBadge, VerificationBadge } from "@/components/status";
import { Badge, Card, EmptyState, PageHeader, Table, Td, cx } from "@/components/ui";
import type { VerificationStatus } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth";
import { DOCUMENT_INFO, REQUIRED_DOCUMENTS, VERIFICATION_STATUS_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Verifications" };

const ORDER: VerificationStatus[] = ["PENDING", "REJECTED", "VERIFIED", "NOT_SUBMITTED"];

export default async function VerificationsPage({ searchParams }: PageProps<"/admin/verifications">) {
  await requireRole("ADMIN");
  const { status: statusParam } = await searchParams;
  const status = ORDER.find((s) => s === statusParam) ?? "PENDING";

  const [candidates, counts] = await Promise.all([
    db.candidateProfile.findMany({
      where: { verificationStatus: status },
      include: {
        user: { select: { name: true, email: true, flagged: true } },
        documents: { where: { type: { in: REQUIRED_DOCUMENTS } } },
      },
      orderBy: status === "PENDING" ? { submittedAt: "asc" } : { updatedAt: "desc" },
    }),
    db.candidateProfile.groupBy({ by: ["verificationStatus"], _count: true }),
  ]);

  return (
    <>
      <PageHeader title="Candidate verifications" description="Check every required document, then approve or send back with a reason." />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Verification status">
        {ORDER.map((s) => (
          <Link
            key={s}
            href={`/admin/verifications?status=${s}`}
            aria-current={s === status ? "page" : undefined}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset",
              s === status ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {VERIFICATION_STATUS_LABEL[s]}{" "}
            <span className="opacity-75">{counts.find((c) => c.verificationStatus === s)?._count ?? 0}</span>
          </Link>
        ))}
      </nav>
      {candidates.length === 0 ? (
        <EmptyState title="Nothing here" />
      ) : (
        <Card bodyClassName="px-2 py-2">
          <Table head={["Candidate", "City", "Submitted", "Notice", ...REQUIRED_DOCUMENTS.map((t) => DOCUMENT_INFO[t].label), "Status"]}>
            {candidates.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/admin/verifications/${c.id}`} className="font-medium text-slate-900 hover:underline">
                    {c.user.name}
                  </Link>
                  <p className="text-xs text-slate-500">{c.user.email}</p>
                  {c.user.flagged && <Badge tone="red">Flagged</Badge>}
                </Td>
                <Td>{c.city ?? "—"}</Td>
                <Td className="whitespace-nowrap">{c.submittedAt ? timeAgo(c.submittedAt) : "—"}</Td>
                <Td className="whitespace-nowrap text-xs">
                  {c.noticePeriodDays != null ? `${c.noticePeriodDays} d` : "—"}
                  <br />
                  LWD {formatDate(c.lastWorkingDay)}
                </Td>
                {REQUIRED_DOCUMENTS.map((t) => {
                  const doc = c.documents.find((d) => d.type === t);
                  return <Td key={t}>{doc ? <DocumentStatusBadge status={doc.status} /> : <span className="text-xs text-slate-400">Missing</span>}</Td>;
                })}
                <Td>
                  <VerificationBadge status={c.verificationStatus} />
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
