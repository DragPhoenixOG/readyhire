import type { Metadata } from "next";
import Link from "next/link";
import { resolveGhostingReport } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { ApplicationStatusBadge, ReportStatusBadge } from "@/components/status";
import { Card, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { GHOSTING_STAGE_LABEL, MIN_REASON_LENGTH } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Ghosting reports" };

export default async function GhostingReportsPage() {
  await requireRole("ADMIN");
  const all = await db.ghostingReport.findMany({
    include: {
      reporter: { select: { name: true, email: true } },
      candidate: { include: { user: { select: { name: true } } } },
      application: {
        include: { job: { include: { company: true } }, interviews: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const reports = [...all.filter((r) => r.status === "OPEN"), ...all.filter((r) => r.status !== "OPEN")];

  return (
    <>
      <PageHeader
        title="Ghosting reports"
        description="Recruiters report candidates who skip interviews or don't join. Upheld reports are shown to recruiters on the candidate's profile."
      />
      {reports.length === 0 ? (
        <EmptyState title="No reports" />
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <Card
              key={r.id}
              title={
                <>
                  <Link href={`/admin/verifications/${r.candidateId}`} className="hover:underline">
                    {r.candidate.user.name}
                  </Link>{" "}
                  · {GHOSTING_STAGE_LABEL[r.stage]}
                </>
              }
              description={`Reported by ${r.reporter.name} (${r.reporter.email}) · ${formatDateTime(r.createdAt)}`}
              actions={<ReportStatusBadge status={r.status} />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 text-sm">
                  <p className="flex flex-wrap items-center gap-2 text-slate-600">
                    {r.application.job.title} · {r.application.job.company.name}
                    <ApplicationStatusBadge status={r.application.status} />
                  </p>
                  <p className="whitespace-pre-line text-slate-800">{r.details}</p>
                  <p className="text-xs text-slate-500">
                    Interviews:{" "}
                    {r.application.interviews
                      .map((i) => `${i.round} (${i.status.toLowerCase().replace("_", "-")})`)
                      .join(", ") || "none"}
                  </p>
                </div>
                {r.status === "OPEN" ? (
                  <ActionForm action={resolveGhostingReport} submitLabel="Resolve" size="sm">
                    <input type="hidden" name="reportId" value={r.id} />
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input type="radio" name="decision" value="UPHELD" required className="accent-rose-600" />{" "}
                        Uphold
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="radio" name="decision" value="DISMISSED" className="accent-brand-700" /> Dismiss
                      </label>
                    </div>
                    <Field label="Resolution note" htmlFor={`note-${r.id}`}>
                      <textarea
                        id={`note-${r.id}`}
                        name="note"
                        rows={2}
                        required
                        minLength={MIN_REASON_LENGTH}
                        className={inputClass}
                      />
                    </Field>
                  </ActionForm>
                ) : (
                  <p className="text-sm text-slate-600">
                    Resolved {formatDateTime(r.resolvedAt)}: {r.resolutionNote}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
