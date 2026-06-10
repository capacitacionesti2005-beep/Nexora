import { prisma } from "@/lib/db/prisma";

export async function logAudit({
  companyId,
  userId,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
}: {
  companyId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      companyId,
      userId,
      action,
      entity,
      entityId,
      oldValue: oldValue === undefined ? undefined : JSON.parse(JSON.stringify(oldValue)),
      newValue: newValue === undefined ? undefined : JSON.parse(JSON.stringify(newValue)),
    },
  });
}
