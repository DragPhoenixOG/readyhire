import type { Metadata } from "next";
import Link from "next/link";
import { setUserFlag, setUserRestriction } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Disclosure } from "@/components/disclosure";
import { Badge, Card, EmptyState, PageHeader, Table, Td, buttonClass, cx, inlineInputClass, inputClass } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

const ROLE_FILTERS = [
  { key: "", label: "All" },
  { key: "CANDIDATE", label: "Candidates" },
  { key: "RECRUITER", label: "Recruiters" },
  { key: "flagged", label: "Flagged" },
  { key: "restricted", label: "Restricted" },
];

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireRole("ADMIN");
  const params = await searchParams;
  const filter = ROLE_FILTERS.find((f) => f.key === params.filter)?.key ?? "";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const where: Prisma.UserWhereInput = {
    ...(filter === "CANDIDATE" || filter === "RECRUITER" ? { role: filter } : {}),
    ...(filter === "flagged" ? { flagged: true } : {}),
    ...(filter === "restricted" ? { status: "RESTRICTED" } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
  };
  const users = await db.user.findMany({
    where,
    include: { candidate: { select: { id: true } }, recruiter: { include: { company: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Users" description="Flag accounts to watch them, or restrict them to block sign-in." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2" aria-label="Filter users">
          {ROLE_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/users${f.key ? `?filter=${f.key}` : ""}`}
              aria-current={f.key === filter ? "page" : undefined}
              className={cx(
                "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset",
                f.key === filter ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          {filter && <input type="hidden" name="filter" value={filter} />}
          <input name="q" defaultValue={q} placeholder="Name or email" aria-label="Search users" className={`${inlineInputClass} w-56`} />
          <button type="submit" className={buttonClass("secondary")}>
            Search
          </button>
        </form>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <Card bodyClassName="px-2 py-2">
          <Table head={["User", "Role", "Joined", "Status", "Actions"]}>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>
                  {u.candidate ? (
                    <Link href={`/admin/verifications/${u.candidate.id}`} className="font-medium text-slate-900 hover:underline">
                      {u.name}
                    </Link>
                  ) : (
                    <p className="font-medium text-slate-900">{u.name}</p>
                  )}
                  <p className="text-xs text-slate-500">{u.email}</p>
                </Td>
                <Td>
                  {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                  {u.recruiter && <p className="text-xs text-slate-500">{u.recruiter.company.name}</p>}
                </Td>
                <Td className="whitespace-nowrap">{formatDate(u.createdAt)}</Td>
                <Td>
                  <div className="flex flex-col items-start gap-1">
                    {u.status === "RESTRICTED" ? <Badge tone="red">Restricted</Badge> : <Badge tone="green">Active</Badge>}
                    {u.flagged && <Badge tone="amber">Flagged</Badge>}
                    {(u.restrictedReason || u.flagReason) && (
                      <p className="max-w-56 text-xs text-slate-500">{u.restrictedReason ?? u.flagReason}</p>
                    )}
                  </div>
                </Td>
                <Td className="min-w-64">
                  {u.role === "ADMIN" || u.id === admin.id ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Disclosure summary={u.flagged ? "Remove flag" : "Flag"}>
                        <ActionForm action={setUserFlag} submitLabel={u.flagged ? "Remove flag" : "Flag user"} size="sm" variant="secondary" className="space-y-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="flagged" value={u.flagged ? "false" : "true"} />
                          {!u.flagged && <input name="reason" required placeholder="Reason" aria-label="Flag reason" className={inputClass} />}
                        </ActionForm>
                      </Disclosure>
                      <Disclosure summary={u.status === "RESTRICTED" ? "Lift restriction" : "Restrict"} tone={u.status === "RESTRICTED" ? "secondary" : "danger"}>
                        <ActionForm
                          action={setUserRestriction}
                          submitLabel={u.status === "RESTRICTED" ? "Lift restriction" : "Restrict user"}
                          size="sm"
                          variant={u.status === "RESTRICTED" ? "secondary" : "danger"}
                          className="space-y-2"
                        >
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="restrict" value={u.status === "RESTRICTED" ? "false" : "true"} />
                          {u.status !== "RESTRICTED" && (
                            <input name="reason" required placeholder="Reason" aria-label="Restriction reason" className={inputClass} />
                          )}
                        </ActionForm>
                      </Disclosure>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
