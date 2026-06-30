import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { syncVehicleComponents } from "@/modules/transport/application/transport-vehicle-components";
import { TransportDisabled, VehicleVisualStatusDetail, type VehicleVisualSnapshot } from "@/modules/transport/transport-content";

type VehicleVisualPageProps = {
  params: Promise<{ plate: string }>;
};

const demoVehicleCatalog: Record<string, {
  type: string;
  status: "IN_ROUTE" | "AVAILABLE" | "MAINTENANCE" | "BLOCKED";
  capacity: string;
  odometer: number;
  currentZone: string;
  vehicleClass: string;
  bodyType: string;
  trailerType?: string;
  wheelCount: number;
  refrigerated: boolean;
  hasLiftGate: boolean;
}> = {
  "TRK-482": { type: "Turbo 4.5T", status: "IN_ROUTE", capacity: "4.5 ton", odometer: 184220, currentZone: "Occidente", vehicleClass: "TRUCK", bodyType: "Furgon", wheelCount: 6, refrigerated: false, hasLiftGate: true },
  "VAN-221": { type: "Van refrigerada", status: "IN_ROUTE", capacity: "1.2 ton", odometer: 92310, currentZone: "Norte", vehicleClass: "VAN", bodyType: "Refrigerado", wheelCount: 4, refrigerated: true, hasLiftGate: false },
  "TRK-615": { type: "Sencillo 8T", status: "AVAILABLE", capacity: "8 ton", odometer: 146800, currentZone: "Cedi Funza", vehicleClass: "RIGID", bodyType: "Furgon", wheelCount: 6, refrigerated: false, hasLiftGate: true },
  "FUR-009": { type: "Furgon", status: "AVAILABLE", capacity: "2 ton", odometer: 118400, currentZone: "Sur", vehicleClass: "VAN", bodyType: "Furgon", wheelCount: 4, refrigerated: false, hasLiftGate: false },
  "TRK-308": { type: "Patineta 32T", status: "BLOCKED", capacity: "32 ton", odometer: 310884, currentZone: "Cota", vehicleClass: "TRACTOR", bodyType: "Portacontenedor", trailerType: "Trailer metalico", wheelCount: 18, refrigerated: false, hasLiftGate: false },
};

async function ensureDemoVehicle(companyId: string, plate: string) {
  const demo = demoVehicleCatalog[plate.toUpperCase()];
  if (!demo) return;

  const vehicle = await prisma.transportVehicle.upsert({
    where: { companyId_plate: { companyId, plate: plate.toUpperCase() } },
    update: {
      type: demo.type,
      status: demo.status,
      capacity: demo.capacity,
      odometer: demo.odometer,
      currentZone: demo.currentZone,
      vehicleClass: demo.vehicleClass,
      bodyType: demo.bodyType,
      trailerType: demo.trailerType,
      wheelCount: demo.wheelCount,
      refrigerated: demo.refrigerated,
      hasLiftGate: demo.hasLiftGate,
      notes: "Activo demo bootstrap para estado visual.",
    },
    create: {
      companyId,
      plate: plate.toUpperCase(),
      type: demo.type,
      status: demo.status,
      capacity: demo.capacity,
      odometer: demo.odometer,
      currentZone: demo.currentZone,
      vehicleClass: demo.vehicleClass,
      bodyType: demo.bodyType,
      trailerType: demo.trailerType,
      wheelCount: demo.wheelCount,
      refrigerated: demo.refrigerated,
      hasLiftGate: demo.hasLiftGate,
      notes: "Activo demo bootstrap para estado visual.",
    },
  });

  await syncVehicleComponents({
    vehicleId: vehicle.id,
    companyId,
    wheelCount: demo.wheelCount,
    refrigerated: demo.refrigerated,
    vehicleClass: demo.vehicleClass,
    trailerType: demo.trailerType,
  });
}

export default async function VehicleVisualPage({ params }: VehicleVisualPageProps) {
  const [{ plate }, user] = await Promise.all([params, requireUser()]);
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: user.companyId },
    select: { transportModuleEnabled: true },
  });

  if (!company.transportModuleEnabled) {
    return <TransportDisabled />;
  }

  const decodedPlate = decodeURIComponent(plate);
  await ensureDemoVehicle(user.companyId, decodedPlate);
  const vehicle = await prisma.transportVehicle.findFirst({
    where: {
      companyId: user.companyId,
      plate: { equals: decodedPlate, mode: "insensitive" },
    },
    include: {
      components: {
        orderBy: [{ condition: "desc" }, { category: "asc" }, { label: "asc" }],
        include: {
          events: {
            orderBy: { createdAt: "desc" },
            take: 8,
          },
        },
      },
      maintenances: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });
  const snapshot: VehicleVisualSnapshot | null = vehicle
    ? {
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      type: vehicle.type,
      status: vehicle.status,
      capacity: vehicle.capacity,
      odometer: vehicle.odometer,
      currentZone: vehicle.currentZone,
      vehicleClass: vehicle.vehicleClass,
      bodyType: vehicle.bodyType,
      trailerType: vehicle.trailerType,
      wheelCount: vehicle.wheelCount,
      refrigerated: vehicle.refrigerated,
      hasLiftGate: vehicle.hasLiftGate,
      maintenances: vehicle.maintenances.map((maintenance) => ({
        id: maintenance.id,
        code: maintenance.code,
        type: maintenance.type,
        status: maintenance.status,
        odometer: maintenance.odometer,
        notes: maintenance.notes,
        createdAt: maintenance.createdAt.toISOString(),
      })),
      components: vehicle.components.map((component) => ({
        id: component.id,
        componentKey: component.componentKey,
        label: component.label,
        category: component.category,
        side: component.side,
        condition: component.condition === "CRITICAL" ? "red" : component.condition === "WARNING" ? "yellow" : "green",
        currentValue: component.currentValue,
        threshold: component.threshold,
        nextAction: component.nextAction,
        x: Number(component.x),
        y: Number(component.y),
        view: component.view,
        nextDueKm: component.nextDueKm,
        notes: component.notes,
        lastCheckedAt: component.lastCheckedAt?.toISOString() ?? null,
        events: component.events.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          title: event.title,
          previousCondition: event.previousCondition === "CRITICAL" ? "red" : event.previousCondition === "WARNING" ? "yellow" : event.previousCondition === "GOOD" ? "green" : null,
          newCondition: event.newCondition === "CRITICAL" ? "red" : event.newCondition === "WARNING" ? "yellow" : event.newCondition === "GOOD" ? "green" : null,
          currentValue: event.currentValue,
          nextDueKm: event.nextDueKm,
          odometer: event.odometer,
          notes: event.notes,
          evidenceUrl: event.evidenceUrl,
          createdByName: event.createdByName,
          createdAt: event.createdAt.toISOString(),
        })),
      })),
    }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild variant="secondary">
          <Link href="/transport/fleet">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a flota
          </Link>
        </Button>
      </div>
      <VehicleVisualStatusDetail plate={plate} snapshot={snapshot} />
    </div>
  );
}
