import type { Metadata } from "next";
import { Card, EmptyState, PageHeader, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditLogPage() {
  await requireRole("ADMIN");
  const entries = await db.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Verification decisions, approvals, restrictions and account-security events. Latest 300 entries."
      />
      {entries.length === 0 ? (
        <EmptyState title="Nothing recorded yet" />
      ) : (
        <Card bodyClassName="px-2 py-2">
          <Table head={["When", "Who", "Action", "Record", "Details"]}>
            {entries.map((e) => (
              <tr key={e.id}>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</Td>
                <Td>{e.actor ? <span title={e.actor.email}>{e.actor.name}</span> : <span className="text-slate-400">System</span>}</Td>
                <Td className="whitespace-nowrap font-mono text-xs">{e.action}</Td>
                <Td className="whitespace-nowrap text-xs text-slate-500">
                  {e.entityType} · {e.entityId.slice(-8)}
                </Td>
                <Td className="max-w-md text-sm">{e.summary}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
