import "server-only";
import { db } from "@/lib/db";

export async function logAudit(params: {
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeValue: params.before === undefined ? null : JSON.stringify(params.before),
      afterValue: params.after === undefined ? null : JSON.stringify(params.after),
    },
  });
}
