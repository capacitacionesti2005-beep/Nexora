"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/modules/audit/log-audit";

type ComponentSeed = {
  key: string;
  label: string;
  category: string;
  side?: string;
  condition?: "GOOD" | "WARNING" | "CRITICAL";
  currentValue?: string;
  threshold?: string;
  nextAction?: string;
  x: number;
  y: number;
  view?: string;
  nextDueKm?: number;
};

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function optionalValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw.length > 0 ? raw : undefined;
}

function decimalToNumber(input: unknown) {
  if (input && typeof input === "object" && "toNumber" in input && typeof input.toNumber === "function") {
    return input.toNumber();
  }

  return Number(input ?? 0);
}

function nextCode(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

async function saveEvidenceFile(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) return undefined;

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || `.${file.type.split("/")[1] || "jpg"}`;
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`.replace(/[^a-zA-Z0-9._-]/g, "");
  const relativeDir = path.join("uploads", "transport-evidence");
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, safeName), bytes);
  return `/${relativeDir.replace(/\\/g, "/")}/${safeName}`;
}

function buildVehicleComponentSeeds({
  wheelCount,
  refrigerated,
  vehicleClass,
  trailerType,
}: {
  wheelCount: number;
  refrigerated: boolean;
  vehicleClass: string;
  trailerType?: string;
}): ComponentSeed[] {
  const addAxlePair = (
    positions: Array<[string, string, string, number, number, string]>,
    axle: string,
    label: string,
    x: number,
    dual = false,
  ) => {
    if (dual) {
      positions.push([`tire-${axle}-left-outer`, `Llanta ${label} izquierda externa`, "Izquierda", x, 78, "left"]);
      positions.push([`tire-${axle}-left-inner`, `Llanta ${label} izquierda interna`, "Izquierda", x + 3, 84, "left"]);
      positions.push([`tire-${axle}-right-outer`, `Llanta ${label} derecha externa`, "Derecha", x, 78, "right"]);
      positions.push([`tire-${axle}-right-inner`, `Llanta ${label} derecha interna`, "Derecha", x + 3, 84, "right"]);
      return;
    }

    positions.push([`tire-${axle}-left`, `Llanta ${label} izquierda`, "Izquierda", x, 78, "left"]);
    positions.push([`tire-${axle}-right`, `Llanta ${label} derecha`, "Derecha", x, 78, "right"]);
  };

  const wheelPositions: Array<[string, string, string, number, number, string]> = [];
  addAxlePair(wheelPositions, "front", "delantera", 18);

  if (wheelCount <= 4) {
    addAxlePair(wheelPositions, "rear", "trasera", 76);
  } else if (wheelCount <= 8) {
    addAxlePair(wheelPositions, "drive", "de traccion", 72, wheelCount >= 6);
  } else if (wheelCount <= 12) {
    addAxlePair(wheelPositions, "drive-1", "de traccion eje 1", 43, true);
    addAxlePair(wheelPositions, "trailer-1", "del trailer eje 1", 76, wheelCount >= 10);
  } else if (wheelCount <= 18) {
    addAxlePair(wheelPositions, "drive-1", "de traccion eje 1", 38, true);
    addAxlePair(wheelPositions, "drive-2", "de traccion eje 2", 48, true);
    addAxlePair(wheelPositions, "trailer-1", "del trailer eje 1", 70, true);
    addAxlePair(wheelPositions, "trailer-2", "del trailer eje 2", 82, true);
  } else {
    addAxlePair(wheelPositions, "lift", "eje auxiliar", 31);
    addAxlePair(wheelPositions, "drive-1", "de traccion eje 1", 41, true);
    addAxlePair(wheelPositions, "drive-2", "de traccion eje 2", 51, true);
    addAxlePair(wheelPositions, "trailer-1", "del trailer eje 1", 68, true);
    addAxlePair(wheelPositions, "trailer-2", "del trailer eje 2", 79, true);
    addAxlePair(wheelPositions, "trailer-3", "del trailer eje 3", 90);
  }

  const wheelSeeds: ComponentSeed[] = wheelPositions.slice(0, wheelCount).map(([key, label, side, x, y, view], index) => ({
    key: String(key),
    label: String(label),
    category: "Llantas",
    side: String(side),
    condition: index === 1 || index === 8 ? "WARNING" : "GOOD",
    currentValue: index === 1 || index === 8 ? "Labranza 5 mm / presion por validar" : "Labranza 9 mm / presion OK",
    threshold: "Cambio <= 3 mm / alerta <= 6 mm",
    nextAction: index === 1 || index === 8 ? "Programar rotacion y validar llanta disponible." : "Continuar monitoreo.",
    x: Number(x),
    y: Number(y),
    view: String(view),
  }));

  const seeds: ComponentSeed[] = [
    ...wheelSeeds,
    { key: "engine-oil", label: "Aceite de motor", category: "Motor", condition: "WARNING", currentValue: "620 km para cambio", threshold: "Alerta < 1.000 km", nextAction: "Programar cambio de aceite y filtro.", x: 25, y: 42, view: "left", nextDueKm: 620 },
    { key: "oil-filter", label: "Filtro de aceite", category: "Motor", condition: "WARNING", currentValue: "Mismo ciclo del aceite", threshold: "Cambio con aceite", nextAction: "Reservar filtro en inventario.", x: 30, y: 46, view: "left", nextDueKm: 620 },
    { key: "air-filter", label: "Filtro de aire", category: "Motor", condition: "GOOD", currentValue: "Vigente", threshold: "Inspeccion cada 10.000 km", nextAction: "Revisar en preventivo.", x: 22, y: 34, view: "left" },
    { key: "fuel-filter", label: "Filtro de combustible", category: "Motor", condition: "GOOD", currentValue: "Sin restriccion", threshold: "Alerta por perdida de potencia o agua", nextAction: "Cambiar por kilometraje o contaminacion.", x: 33, y: 54, view: "left" },
    { key: "coolant", label: "Refrigerante y radiador", category: "Motor", condition: "GOOD", currentValue: "Nivel normal", threshold: "Alerta por temperatura o nivel bajo", nextAction: "Validar fugas y concentracion.", x: 19, y: 28, view: "left" },
    { key: "belts", label: "Correas y poleas", category: "Motor", condition: "GOOD", currentValue: "Sin ruido", threshold: "Alerta por grieta, ruido o tension baja", nextAction: "Inspeccion visual de correas.", x: 27, y: 30, view: "left" },
    { key: "turbo-intake", label: "Turbo / admision", category: "Motor", condition: "GOOD", currentValue: "Presion normal", threshold: "Alerta por humo, silbido o fuga", nextAction: "Validar abrazaderas y mangueras.", x: 36, y: 36, view: "left" },
    { key: "exhaust-dpf", label: "Escape / DPF", category: "Emisiones", condition: "GOOD", currentValue: "Regeneracion normal", threshold: "Alerta por restriccion o temperatura", nextAction: "Revisar sensores y codigos.", x: 45, y: 67, view: "left" },
    { key: "brakes-front", label: "Frenos delanteros", category: "Seguridad", condition: "GOOD", currentValue: "Operativo", threshold: "Bloquear por fuga, baja presion o desgaste", nextAction: "Medir bandas/pastillas.", x: 19, y: 66, view: "left" },
    { key: "brakes-drive", label: "Frenos eje de traccion", category: "Seguridad", condition: vehicleClass === "TRACTOR" ? "WARNING" : "GOOD", currentValue: vehicleClass === "TRACTOR" ? "Presion por validar" : "Operativo", threshold: "Bloquear por fuga, baja presion o ABS", nextAction: "Validar en preoperacional.", x: 47, y: 66, view: "left" },
    { key: "brakes-trailer", label: "Frenos del trailer", category: "Seguridad", condition: trailerType ? "WARNING" : "GOOD", currentValue: trailerType ? "Acople de aire por validar" : "No aplica trailer", threshold: "Bloquear por fuga o freno desajustado", nextAction: "Prueba de aire y frenado.", x: 78, y: 66, view: "left" },
    { key: "air-compressor", label: "Compresor y lineas de aire", category: "Seguridad", condition: "GOOD", currentValue: "Carga normal", threshold: "Alerta por baja presion o fuga", nextAction: "Revisar secador, lineas y racores.", x: 39, y: 58, view: "left" },
    { key: "abs-sensors", label: "Sensores ABS/EBS", category: "Seguridad", condition: "GOOD", currentValue: "Sin testigo", threshold: "Bloquear si ABS queda activo", nextAction: "Escanear codigos si aparece alerta.", x: 63, y: 73, view: "left" },
    { key: "suspension-front", label: "Suspension delantera", category: "Chasis", condition: "GOOD", currentValue: "Sin fuga", threshold: "Alerta por fuga, hoja partida o ruido", nextAction: "Inspeccion visual.", x: 22, y: 71, view: "left" },
    { key: "suspension-rear", label: "Suspension trasera / bolsas", category: "Chasis", condition: "GOOD", currentValue: "Altura normal", threshold: "Alerta por fuga, desgaste o desnivel", nextAction: "Validar bolsas, bujes y amortiguadores.", x: 63, y: 72, view: "left" },
    { key: "steering", label: "Direccion / terminales", category: "Seguridad", condition: "GOOD", currentValue: "Sin juego reportado", threshold: "Alerta por juego o vibracion", nextAction: "Prueba en ruta.", x: 29, y: 59, view: "left" },
    { key: "transmission", label: "Transmision", category: "Tren motriz", condition: "GOOD", currentValue: "Operativo", threshold: "Alerta por fuga, golpe o ruido", nextAction: "Inspeccion por kilometraje.", x: 44, y: 55, view: "left" },
    { key: "differential", label: "Diferencial / ejes", category: "Tren motriz", condition: "GOOD", currentValue: "Sin fuga", threshold: "Alerta por temperatura o fuga", nextAction: "Revisar nivel y retenedores.", x: 57, y: 60, view: "left" },
    { key: "fuel-tank", label: "Tanque de combustible", category: "Combustible", condition: "GOOD", currentValue: "Sin fuga", threshold: "Alerta por consumo anormal o fuga", nextAction: "Cruzar con tanqueos.", x: 51, y: 49, view: "right" },
    { key: "def-system", label: "Sistema DEF / AdBlue", category: "Emisiones", condition: "GOOD", currentValue: "Nivel OK", threshold: "Alerta por cristalizacion o bajo nivel", nextAction: "Revisar calidad y consumo.", x: 43, y: 54, view: "right" },
    { key: "battery", label: "Bateria y alternador", category: "Electrico", condition: "GOOD", currentValue: "Voltaje en rango", threshold: "Alerta < 12.2V", nextAction: "Medir voltaje semanal.", x: 38, y: 43, view: "right" },
    { key: "starter", label: "Arranque y cableado principal", category: "Electrico", condition: "GOOD", currentValue: "Sin novedad", threshold: "Alerta por caida de voltaje", nextAction: "Revisar bornes y tierra.", x: 31, y: 47, view: "right" },
    { key: "front-lights", label: "Luces frontales y direccionales", category: "Seguridad vial", condition: "GOOD", currentValue: "Aprobado", threshold: "Bloquear si luces criticas fallan", nextAction: "Validar en checklist.", x: 11, y: 39, view: "left" },
    { key: "rear-lights", label: "Luces traseras y stop", category: "Seguridad vial", condition: "GOOD", currentValue: "Aprobado", threshold: "Bloquear si stop/direccional falla", nextAction: "Validar antes de despacho nocturno.", x: 50, y: 63, view: "rear" },
    { key: "reverse-alarm", label: "Alarma de reversa / camara", category: "Seguridad vial", condition: "GOOD", currentValue: "Operativo", threshold: "Alerta si no emite senal", nextAction: "Probar en patio.", x: 50, y: 48, view: "rear" },
    { key: "mirrors", label: "Espejos y puntos ciegos", category: "Cabina", condition: "GOOD", currentValue: "Alineados", threshold: "Alerta por espejo roto o sensor fallando", nextAction: "Validar antes de salida.", x: 22, y: 24, view: "left" },
    { key: "windshield-wipers", label: "Parabrisas y plumillas", category: "Cabina", condition: "GOOD", currentValue: "Sin novedad", threshold: "Alerta por fisura o barrido deficiente", nextAction: "Cambiar plumillas si deja rastro.", x: 18, y: 18, view: "left" },
    { key: "body-side", label: trailerType ? `Lateral de ${trailerType}` : "Carroceria lateral", category: "Carroceria", condition: "GOOD", currentValue: "Estructura vigente", threshold: "Alerta por fisura, golpe o filtracion", nextAction: "Inspeccion visual.", x: 70, y: 36, view: "left" },
    { key: "rear-doors", label: "Puertas traseras / chapas", category: "Carroceria", condition: "GOOD", currentValue: "Cierre vigente", threshold: "Alerta por chapa, bisagra o sello", nextAction: "Validar cierre y precinto.", x: 50, y: 33, view: "rear" },
    { key: "bumper-mudflaps", label: "Defensa, guardabarros y salpicaderas", category: "Carroceria", condition: "GOOD", currentValue: "Sin desprendimiento", threshold: "Alerta por pieza suelta o cortante", nextAction: "Reparar antes de ruta larga.", x: 50, y: 76, view: "rear" },
    { key: "roof-seals", label: "Techo, sellos y filtraciones", category: "Carroceria", condition: "GOOD", currentValue: "Sin filtracion", threshold: "Alerta por humedad o sello vencido", nextAction: "Inspeccion en lavado o lluvia.", x: 61, y: 34, view: "top" },
    { key: "cargo-floor", label: "Piso de carga", category: "Carroceria", condition: "GOOD", currentValue: "Sin fisura", threshold: "Alerta por tabla rota, corrosion o desnivel", nextAction: "Inspeccion al descargar.", x: 66, y: 55, view: "top" },
  ];

  if (refrigerated) {
    seeds.push(
      { key: "reefer-unit", label: "Unidad de refrigeracion", category: "Cadena de frio", condition: "WARNING", currentValue: "Temperatura por validar", threshold: "Alerta por desviacion de temperatura", nextAction: "Validar preenfriado, sellos y sensor.", x: 58, y: 18, view: "top" },
      { key: "reefer-evaporator", label: "Evaporador / ventiladores", category: "Cadena de frio", condition: "GOOD", currentValue: "Flujo OK", threshold: "Alerta por bloqueo o ruido", nextAction: "Limpiar y revisar ventiladores.", x: 74, y: 29, view: "top" },
      { key: "temperature-probe", label: "Sonda de temperatura", category: "Cadena de frio", condition: "GOOD", currentValue: "Sensor activo", threshold: "Alerta por desviacion o desconexion", nextAction: "Comparar contra termometro patron.", x: 77, y: 45, view: "top" },
    );
  }

  if (vehicleClass === "TRACTOR" || trailerType) {
    seeds.push(
      { key: "coupling", label: "Quinta rueda / acople", category: "Acople", condition: "GOOD", currentValue: "Bloqueo vigente", threshold: "Bloquear si hay holgura o seguro incompleto", nextAction: "Prueba de acople antes de despacho.", x: 48, y: 45, view: "top" },
      { key: "kingpin", label: "King pin y plato", category: "Acople", condition: "GOOD", currentValue: "Sin holgura", threshold: "Bloquear por desgaste o fisura", nextAction: "Engrasar y validar seguro.", x: 55, y: 45, view: "top" },
      { key: "landing-gear", label: "Patas de apoyo del trailer", category: "Acople", condition: "GOOD", currentValue: "Operativas", threshold: "Alerta por manivela o zapata danada", nextAction: "Lubricar y probar carga.", x: 61, y: 68, view: "left" },
      { key: "air-electrical-lines", label: "Mangueras de aire y linea electrica", category: "Acople", condition: "GOOD", currentValue: "Conectadas", threshold: "Bloquear por fuga, roce o cable cortado", nextAction: "Validar espirales y conectores.", x: 53, y: 33, view: "left" },
    );
  }

  if (String(trailerType ?? "").toLowerCase().includes("carpa")) {
    seeds.push(
      { key: "tarp", label: "Carpa / lona", category: "Carroceria", condition: "GOOD", currentValue: "Sin rotura", threshold: "Alerta por rasgadura o filtracion", nextAction: "Reparar antes de cargar.", x: 73, y: 25, view: "left" },
      { key: "tarp-tensioners", label: "Tensores y amarres", category: "Carroceria", condition: "GOOD", currentValue: "Completos", threshold: "Alerta por tensor faltante", nextAction: "Validar en cargue.", x: 77, y: 50, view: "left" },
    );
  }

  return seeds;
}

async function syncVehicleComponents({
  vehicleId,
  companyId,
  wheelCount,
  refrigerated,
  vehicleClass,
  trailerType,
}: {
  vehicleId: string;
  companyId: string;
  wheelCount: number;
  refrigerated: boolean;
  vehicleClass: string;
  trailerType?: string;
}) {
  const seeds = buildVehicleComponentSeeds({ wheelCount, refrigerated, vehicleClass, trailerType });
  await prisma.$transaction(
    seeds.map((seed) =>
      prisma.transportVehicleComponent.upsert({
        where: { vehicleId_componentKey: { vehicleId, componentKey: seed.key } },
        update: {
          label: seed.label,
          category: seed.category,
          side: seed.side,
          threshold: seed.threshold,
          nextAction: seed.nextAction,
          x: seed.x,
          y: seed.y,
          view: seed.view ?? "diagonal",
          nextDueKm: seed.nextDueKm,
        },
        create: {
          companyId,
          vehicleId,
          componentKey: seed.key,
          label: seed.label,
          category: seed.category,
          side: seed.side,
          condition: seed.condition ?? "GOOD",
          currentValue: seed.currentValue,
          threshold: seed.threshold,
          nextAction: seed.nextAction,
          x: seed.x,
          y: seed.y,
          view: seed.view ?? "diagonal",
          nextDueKm: seed.nextDueKm,
        },
      }),
    ),
  );
}

export async function createTransportVehicle(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    plate: z.string().min(3).max(20),
    type: z.string().min(2).max(80),
    vehicleClass: z.string().min(2).max(40).default("TRUCK"),
    bodyType: z.string().min(2).max(80).default("Furgon"),
    trailerType: z.string().max(80).optional(),
    wheelCount: z.coerce.number().int().min(4).max(22).default(6),
    refrigerated: z.boolean().default(false),
    hasLiftGate: z.boolean().default(false),
    capacity: z.string().max(60).optional(),
    odometer: z.coerce.number().int().min(0).default(0),
    currentZone: z.string().max(80).optional(),
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.parse({
    plate: value(formData, "plate").toUpperCase(),
    type: value(formData, "type"),
    vehicleClass: value(formData, "vehicleClass") || "TRUCK",
    bodyType: value(formData, "bodyType") || "Furgon",
    trailerType: optionalValue(formData, "trailerType"),
    wheelCount: value(formData, "wheelCount") || "6",
    refrigerated: formData.get("refrigerated") === "on",
    hasLiftGate: formData.get("hasLiftGate") === "on",
    capacity: optionalValue(formData, "capacity"),
    odometer: value(formData, "odometer") || "0",
    currentZone: optionalValue(formData, "currentZone"),
    notes: optionalValue(formData, "notes"),
  });

  const vehicle = await prisma.transportVehicle.upsert({
    where: { companyId_plate: { companyId: user.companyId, plate: parsed.plate } },
    update: parsed,
    create: {
      companyId: user.companyId,
      ...parsed,
    },
  });

  await syncVehicleComponents({
    vehicleId: vehicle.id,
    companyId: user.companyId,
    wheelCount: parsed.wheelCount,
    refrigerated: parsed.refrigerated,
    vehicleClass: parsed.vehicleClass,
    trailerType: parsed.trailerType,
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "transport.vehicle.upsert",
    entity: "TransportVehicle",
    entityId: vehicle.id,
    newValue: vehicle,
  });

  revalidatePath("/transport/integrations");
  revalidatePath("/transport/maintenance");
  redirect("/transport/integrations?vehicleSaved=1");
}

export async function consumeMaintenancePart(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    vehicleId: z.string().min(1),
    productId: z.string().min(1),
    warehouseId: z.string().min(1),
    quantity: z.coerce.number().positive(),
    maintenanceType: z.string().min(2).max(80).default("Correctivo"),
    odometer: z.coerce.number().int().min(0).optional(),
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.parse({
    vehicleId: value(formData, "vehicleId"),
    productId: value(formData, "productId"),
    warehouseId: value(formData, "warehouseId"),
    quantity: value(formData, "quantity"),
    maintenanceType: value(formData, "maintenanceType") || "Correctivo",
    odometer: optionalValue(formData, "odometer"),
    notes: optionalValue(formData, "notes"),
  });

  const [company, vehicle, product, warehouse] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { costingMethod: true, transportModuleEnabled: true } }),
    prisma.transportVehicle.findFirstOrThrow({ where: { id: parsed.vehicleId, companyId: user.companyId } }),
    prisma.product.findFirstOrThrow({
      where: { id: parsed.productId, companyId: user.companyId, status: "ACTIVE" },
      include: { baseUnit: true },
    }),
    prisma.warehouse.findFirstOrThrow({ where: { id: parsed.warehouseId, companyId: user.companyId, status: "ACTIVE" } }),
  ]);

  if (!company.transportModuleEnabled) {
    redirect("/settings?error=transport-disabled");
  }

  const result = await prisma.$transaction(async (tx) => {
    const stock = await tx.stock.findFirst({
      where: {
        companyId: user.companyId,
        productId: product.id,
        warehouseId: warehouse.id,
        availableQuantity: { gt: 0 },
      },
      orderBy: [{ availableQuantity: "desc" }, { updatedAt: "desc" }],
    });

    const availableQuantity = decimalToNumber(stock?.availableQuantity);
    if (!stock || availableQuantity < parsed.quantity) {
      return { ok: false as const };
    }

    const currentQuantity = decimalToNumber(stock.quantity);
    const reservedQuantity = decimalToNumber(stock.reservedQuantity);
    const averageCost = decimalToNumber(stock.averageCost || product.averageCost || product.unitCost);
    const nextQuantity = currentQuantity - parsed.quantity;
    const totalCost = parsed.quantity * averageCost;

    await tx.stock.update({
      where: { id: stock.id },
      data: {
        quantity: nextQuantity,
        availableQuantity: Math.max(nextQuantity - reservedQuantity, 0),
        totalCost: nextQuantity * averageCost,
      },
    });

    const maintenanceOrder = await tx.transportMaintenanceOrder.create({
      data: {
        companyId: user.companyId,
        code: nextCode("MTO"),
        vehicleId: vehicle.id,
        status: "IN_PROGRESS",
        type: parsed.maintenanceType,
        odometer: parsed.odometer || vehicle.odometer || undefined,
        notes: parsed.notes,
      },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        companyId: user.companyId,
        productId: product.id,
        movementType: "OUT",
        movementReason: "Consumo mantenimiento transporte",
        warehouseFromId: warehouse.id,
        locationFromId: stock.locationId,
        unitId: product.baseUnitId,
        quantity: parsed.quantity,
        unitCost: averageCost,
        totalCost,
        documentNumber: maintenanceOrder.code,
        responsibleUserId: user.id,
        notes: `Vehiculo ${vehicle.plate}. ${parsed.notes ?? ""}`.trim(),
      },
    });

    const part = await tx.transportMaintenancePart.create({
      data: {
        companyId: user.companyId,
        maintenanceOrderId: maintenanceOrder.id,
        productId: product.id,
        warehouseId: warehouse.id,
        locationId: stock.locationId,
        inventoryMovementId: movement.id,
        quantity: parsed.quantity,
        unitCost: averageCost,
        totalCost,
        notes: parsed.notes,
      },
    });

    await tx.transportVehicle.update({
      where: { id: vehicle.id },
      data: {
        status: "MAINTENANCE",
        odometer: parsed.odometer || vehicle.odometer,
      },
    });

    return { ok: true as const, movement, maintenanceOrder, part };
  });

  if (!result.ok) {
    redirect("/transport/integrations?error=insufficient-stock");
  }

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "transport.maintenance.part.consume",
    entity: "TransportMaintenancePart",
    entityId: result.part.id,
    newValue: result,
  });

  revalidatePath("/stock");
  revalidatePath("/movements/outputs");
  revalidatePath("/transport/integrations");
  revalidatePath("/transport/maintenance");
  revalidatePath("/transport/costs");
  redirect("/transport/integrations?partConsumed=1");
}

export async function updateVehicleComponentCondition(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    componentId: z.string().min(1),
    plate: z.string().min(1),
    condition: z.enum(["GOOD", "WARNING", "CRITICAL"]),
    currentValue: z.string().max(120).optional(),
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.parse({
    componentId: value(formData, "componentId"),
    plate: value(formData, "plate"),
    condition: value(formData, "condition"),
    currentValue: optionalValue(formData, "currentValue"),
    notes: optionalValue(formData, "notes"),
  });

  const component = await prisma.transportVehicleComponent.findFirstOrThrow({
    where: {
      id: parsed.componentId,
      companyId: user.companyId,
    },
  });

  const updated = await prisma.transportVehicleComponent.update({
    where: { id: component.id },
    data: {
      condition: parsed.condition,
      currentValue: parsed.currentValue ?? component.currentValue,
      notes: parsed.notes ?? component.notes,
      lastCheckedAt: new Date(),
    },
  });

  await prisma.transportVehicleComponentEvent.create({
    data: {
      companyId: user.companyId,
      vehicleId: component.vehicleId,
      componentId: component.id,
      eventType: "INSPECTION",
      title: "Actualizacion rapida de estado",
      previousCondition: component.condition,
      newCondition: parsed.condition,
      currentValue: parsed.currentValue ?? component.currentValue,
      notes: parsed.notes ?? component.notes,
      createdByName: user.name,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "transport.vehicle.component.update",
    entity: "TransportVehicleComponent",
    entityId: updated.id,
    oldValue: component,
    newValue: updated,
  });

  revalidatePath(`/transport/fleet/${parsed.plate}`);
  redirect(`/transport/fleet/${encodeURIComponent(parsed.plate)}?componentUpdated=1`);
}

export async function registerVehicleComponentEvent(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    componentId: z.string().min(1),
    plate: z.string().min(1),
    eventType: z.enum(["INSPECTION", "COMMENT", "ADJUSTMENT", "MAINTENANCE", "REPLACEMENT"]),
    condition: z.enum(["GOOD", "WARNING", "CRITICAL"]),
    eventTitle: z.string().min(3).max(120),
    currentValue: z.string().max(120).optional(),
    nextDueKm: z.coerce.number().int().min(0).optional(),
    odometer: z.coerce.number().int().min(0).optional(),
    notes: z.string().max(1000).optional(),
  });
  const parsed = schema.parse({
    componentId: value(formData, "componentId"),
    plate: value(formData, "plate"),
    eventType: value(formData, "eventType"),
    condition: value(formData, "condition"),
    eventTitle: value(formData, "eventTitle"),
    currentValue: optionalValue(formData, "currentValue"),
    nextDueKm: optionalValue(formData, "nextDueKm"),
    odometer: optionalValue(formData, "odometer"),
    notes: optionalValue(formData, "notes"),
  });
  const evidenceUrl = await saveEvidenceFile(formData.get("evidence"));

  const component = await prisma.transportVehicleComponent.findFirstOrThrow({
    where: {
      id: parsed.componentId,
      companyId: user.companyId,
    },
  });

  const [updated, event] = await prisma.$transaction([
    prisma.transportVehicleComponent.update({
      where: { id: component.id },
      data: {
        condition: parsed.condition,
        currentValue: parsed.currentValue ?? component.currentValue,
        notes: parsed.notes ?? component.notes,
        nextDueKm: parsed.nextDueKm ?? component.nextDueKm,
        lastCheckedAt: new Date(),
      },
    }),
    prisma.transportVehicleComponentEvent.create({
      data: {
        companyId: user.companyId,
        vehicleId: component.vehicleId,
        componentId: component.id,
        eventType: parsed.eventType,
        title: parsed.eventTitle,
        previousCondition: component.condition,
        newCondition: parsed.condition,
        currentValue: parsed.currentValue ?? component.currentValue,
        nextDueKm: parsed.nextDueKm,
        odometer: parsed.odometer,
        notes: parsed.notes,
        evidenceUrl,
        createdByName: user.name,
      },
    }),
  ]);

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "transport.vehicle.component.event.create",
    entity: "TransportVehicleComponentEvent",
    entityId: event.id,
    oldValue: component,
    newValue: { updated, event },
  });

  revalidatePath(`/transport/fleet/${parsed.plate}`);
  redirect(`/transport/fleet/${encodeURIComponent(parsed.plate)}?componentEventSaved=1`);
}

export async function runVehicleComponentQuickAction(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    componentId: z.string().min(1),
    plate: z.string().min(1),
    actionType: z.enum(["OPEN_WORK_ORDER", "SEND_TO_SHOP", "BLOCK_DISPATCH", "SCHEDULE_REVIEW"]),
  });
  const parsed = schema.parse({
    componentId: value(formData, "componentId"),
    plate: value(formData, "plate"),
    actionType: value(formData, "actionType"),
  });

  const component = await prisma.transportVehicleComponent.findFirstOrThrow({
    where: { id: parsed.componentId, companyId: user.companyId },
    include: { vehicle: true },
  });

  const actionConfig = {
    OPEN_WORK_ORDER: {
      title: "Orden de trabajo creada",
      type: "Correctivo",
      eventType: "MAINTENANCE" as const,
      vehicleStatus: component.vehicle.status,
      notes: `OT generada desde estado visual para ${component.label}.`,
    },
    SEND_TO_SHOP: {
      title: "Vehiculo enviado a taller",
      type: "Correctivo",
      eventType: "MAINTENANCE" as const,
      vehicleStatus: "MAINTENANCE" as const,
      notes: `Envio a taller solicitado desde estado visual por ${component.label}.`,
    },
    BLOCK_DISPATCH: {
      title: "Despacho bloqueado",
      type: "Bloqueo",
      eventType: "ADJUSTMENT" as const,
      vehicleStatus: "BLOCKED" as const,
      notes: `Bloqueo operativo desde estado visual por ${component.label}.`,
    },
    SCHEDULE_REVIEW: {
      title: "Revision programada",
      type: "Preventivo",
      eventType: "INSPECTION" as const,
      vehicleStatus: component.vehicle.status,
      notes: `Revision preventiva programada desde estado visual para ${component.label}.`,
    },
  }[parsed.actionType];

  const maintenanceOrder = parsed.actionType === "BLOCK_DISPATCH"
    ? null
    : await prisma.transportMaintenanceOrder.create({
      data: {
        companyId: user.companyId,
        code: nextCode("MT"),
        vehicleId: component.vehicleId,
        type: actionConfig.type,
        status: "OPEN",
        odometer: component.vehicle.odometer,
        notes: actionConfig.notes,
      },
    });

  const [updatedVehicle, event] = await prisma.$transaction([
    prisma.transportVehicle.update({
      where: { id: component.vehicleId },
      data: { status: actionConfig.vehicleStatus },
    }),
    prisma.transportVehicleComponentEvent.create({
      data: {
        companyId: user.companyId,
        vehicleId: component.vehicleId,
        componentId: component.id,
        eventType: actionConfig.eventType,
        title: actionConfig.title,
        previousCondition: component.condition,
        newCondition: parsed.actionType === "BLOCK_DISPATCH" ? "CRITICAL" : component.condition,
        currentValue: component.currentValue,
        nextDueKm: component.nextDueKm,
        odometer: component.vehicle.odometer,
        notes: `${actionConfig.notes}${maintenanceOrder ? ` OT ${maintenanceOrder.code}.` : ""}`,
        createdByName: user.name,
      },
    }),
  ]);

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "transport.vehicle.component.quick-action",
    entity: "TransportVehicleComponentEvent",
    entityId: event.id,
    oldValue: component,
    newValue: { updatedVehicle, maintenanceOrder, event },
  });

  revalidatePath(`/transport/fleet/${parsed.plate}`);
  revalidatePath("/transport/maintenance");
  redirect(`/transport/fleet/${encodeURIComponent(parsed.plate)}?quickAction=${parsed.actionType}`);
}
