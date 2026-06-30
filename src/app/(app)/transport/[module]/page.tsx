import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { TransportDisabled, TransportModuleDetail } from "@/modules/transport/transport-content";
import { TransportInventoryBridge } from "@/modules/transport/transport-inventory-bridge";
import { isTransportModuleSlug } from "@/modules/transport/transport-routing";

type TransportModulePageProps = {
  params: Promise<{ module: string }>;
  searchParams?: Promise<{ vehicleSaved?: string; partConsumed?: string; error?: string; prefillVehicleId?: string; prefillPlate?: string; prefillComponentLabel?: string; intent?: string }>;
};

export default async function TransportModulePage({ params, searchParams }: TransportModulePageProps) {
  const [{ module: slug }, query, user] = await Promise.all([params, searchParams ?? Promise.resolve({}), requireUser()]);
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: user.companyId },
    select: { transportModuleEnabled: true, inventoryModuleEnabled: true },
  });

  if (!company.transportModuleEnabled) {
    return <TransportDisabled />;
  }

  if (!isTransportModuleSlug(slug)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <TransportModuleDetail moduleSlug={slug} suiteEnabled={company.inventoryModuleEnabled} />
      {slug === "integrations" || slug === "maintenance" || slug === "costs" ? (
        <TransportInventoryBridge companyId={user.companyId} searchParams={query} />
      ) : null}
    </div>
  );
}
