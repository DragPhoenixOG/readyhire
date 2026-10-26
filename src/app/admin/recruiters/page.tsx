import type { Metadata } from "next";
import { decideRecruiter } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { ApprovalBadge } from "@/components/status";
import { Badge, Card, EmptyState, PageHeader, Table, Td, buttonClass, inputClass } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRecruiterDomain, websiteHost } from "@/lib/domain";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Recruiters" };

export default async function AdminRecruitersPage() {
  await requireRole("ADMIN");
  const recruiters = await db.recruiterProfile.findMany({
    include: {
      user: {
        select: { name: true, email: true, status: true, flagged: true },
      },
      reviewedBy: { select: { name: true } },
      company: true,
      _count: { select: { jobs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  // The approval queue comes first.
  const sorted = [
    ...recruiters.filter((r) => r.approvalStatus === "PENDING"),
    ...recruiters.filter((r) => r.approvalStatus !== "PENDING"),
  ];

  return (
    <>
      <PageHeader
        title="Recruiters"
        description="Approve recruiters after checking their company domain. Only approved recruiters can post jobs and see candidates."
      />
      {sorted.length === 0 ? (
        <EmptyState title="No recruiters yet" />
      ) : (
        <Card bodyClassName="px-2 py-2">
          <Table
            head={["Recruiter", "Company & domain", "Domain check", "Signed up", "Jobs", "Status", "Decision"]}
            columns={["w-[24%]", "w-[16%]", "w-[13%]", "w-[10.5%]", "w-[5.5%]", "w-[13%]", "w-[18%]"]}
            minWidth="min-w-[960px]"
          >
            {sorted.map((r) => {
              const domainIssue = checkRecruiterDomain(r.user.email, r.company.website);
              return (
                <tr key={r.id}>
                  <Td>
                    <p className="font-medium text-slate-900">{r.user.name}</p>
                    {/* Long addresses break after the @ first, and anywhere only if that isn't enough. */}
                    <p className="text-xs wrap-anywhere text-slate-500">
                      {r.user.email.replace(/@.*/, "")}@<wbr />
                      {r.user.email.replace(/^[^@]*@/, "")}
                    </p>
                    <p className="text-xs text-slate-500">{r.title}</p>
                    {r.user.status === "RESTRICTED" && <Badge tone="red">Restricted</Badge>}
                  </Td>
                  <Td>
                    <p>{r.company.name}</p>
                    <p className="text-xs wrap-anywhere text-slate-500">@{r.company.domain}</p>
                    {/* The website only adds something when it isn't the email domain again. */}
                    {r.company.website && websiteHost(r.company.website) !== r.company.domain && (
                      <p className="text-xs wrap-anywhere text-slate-500">
                        {websiteHost(r.company.website) ?? r.company.website}
                      </p>
                    )}
                  </Td>
                  <Td>
                    {domainIssue ? (
                      <span className="block">
                        <Badge tone="red" wrap>
                          {domainIssue}
                        </Badge>
                      </span>
                    ) : (
                      <Badge tone="green">Company domain</Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                  <Td>{r._count.jobs}</Td>
                  <Td>
                    <ApprovalBadge status={r.approvalStatus} />
                    {r.reviewNote && <p className="mt-1 max-w-48 text-xs text-slate-500">{r.reviewNote}</p>}
                  </Td>
                  <Td>
                    {r.approvalStatus === "PENDING" ? (
                      <ActionForm action={decideRecruiter} submitLabel="Save" size="sm" className="space-y-2">
                        <input type="hidden" name="recruiterId" value={r.id} />
                        <div className="flex gap-3 text-sm">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="decision"
                              value="APPROVED"
                              required
                              className="accent-brand-700"
                            />
                            Approve
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input type="radio" name="decision" value="REJECTED" className="accent-rose-600" />
                            Reject
                          </label>
                        </div>
                        <input
                          name="note"
                          placeholder="Note, if rejecting"
                          aria-label="Decision note"
                          className={inputClass}
                        />
                      </ActionForm>
                    ) : (
                      // Decisions are final: show the one recorded, read-only.
                      <fieldset disabled className="space-y-2" aria-label="Decision (recorded)">
                        <div className="flex gap-3 text-sm text-slate-500">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              checked={r.approvalStatus === "APPROVED"}
                              readOnly
                              className="accent-brand-700"
                            />
                            Approve
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              checked={r.approvalStatus === "REJECTED"}
                              readOnly
                              className="accent-rose-600"
                            />
                            Reject
                          </label>
                        </div>
                        {r.reviewedAt && (
                          <p className="text-xs text-slate-500">
                            Decided {formatDate(r.reviewedAt)}
                            {r.reviewedBy && ` by ${r.reviewedBy.name}`}
                          </p>
                        )}
                        <button type="button" className={buttonClass("secondary", "sm")}>
                          Save
                        </button>
                      </fieldset>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}
    </>
  );
}
