import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { TransportDashboard, TransportDisabled } from "@/modules/transport/transport-content";

export default async function TransportPage() {
  const user = await requireUser();
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: user.companyId },
    select: { transportModuleEnabled: true, inventoryModuleEnabled: true },
  });

  if (!company.transportModuleEnabled) {
    return <TransportDisabled />;
  }

  return <TransportDashboard suiteEnabled={company.inventoryModuleEnabled} />;
}
