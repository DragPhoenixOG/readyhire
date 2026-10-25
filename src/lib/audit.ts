import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type AuditEntity = "CandidateProfile" | "Document" | "RecruiterProfile" | "User" | "GhostingReport";

/** Records a trust-critical action (admin decisions, account security events). */
export function audit(
  actorId: string | null,
  action: string,
  entityType: AuditEntity,
  entityId: string,
  summary: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.auditLog.create({
    data: { actorId, action, entityType, entityId, summary },
  });
}
