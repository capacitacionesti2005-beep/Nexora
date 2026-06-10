"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/modules/audit/log-audit";

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

function parseDate(raw?: string) {
  if (!raw) return undefined;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function issueUnitCost({
  costingMethod,
  stockAverageCost,
  productAverageCost,
  fallbackCost = 0,
}: {
  costingMethod: string;
  stockAverageCost?: unknown;
  productAverageCost?: unknown;
  fallbackCost?: number;
}) {
  if (costingMethod === "STANDARD") {
    return decimalToNumber(productAverageCost || fallbackCost);
  }

  return decimalToNumber(stockAverageCost || productAverageCost || fallbackCost);
}

async function assertLocation({
  companyId,
  warehouseId,
  locationId,
}: {
  companyId: string;
  warehouseId: string;
  locationId?: string;
}) {
  if (!locationId) return null;

  return prisma.location.findFirstOrThrow({
    where: {
      id: locationId,
      companyId,
      warehouseId,
      status: "ACTIVE",
    },
  });
}

async function refreshProductAverageCost(companyId: string, productId: string) {
  const totals = await prisma.stock.aggregate({
    where: { companyId, productId },
    _sum: {
      quantity: true,
      totalCost: true,
    },
  });

  const quantity = decimalToNumber(totals._sum.quantity);
  const totalCost = decimalToNumber(totals._sum.totalCost);

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageCost: quantity > 0 ? totalCost / quantity : 0,
    },
  });
}

const movementSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  locationId: z.string().optional(),
  unitId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0).default(0),
  documentNumber: z.string().max(80).optional(),
  movementReason: z.string().min(2).max(80),
  notes: z.string().max(500).optional(),
  lotNumber: z.string().max(80).optional(),
  serialNumber: z.string().max(80).optional(),
  expirationDate: z.date().optional(),
});

export async function createEntry(formData: FormData) {
  const user = await requireUser();
  const parsed = movementSchema.parse({
    productId: value(formData, "productId"),
    warehouseId: value(formData, "warehouseId"),
    locationId: optionalValue(formData, "locationId"),
    unitId: value(formData, "unitId"),
    quantity: value(formData, "quantity"),
    unitCost: value(formData, "unitCost") || "0",
    documentNumber: optionalValue(formData, "documentNumber"),
    movementReason: value(formData, "movementReason") || "Compra",
    notes: optionalValue(formData, "notes"),
    lotNumber: optionalValue(formData, "lotNumber"),
    serialNumber: optionalValue(formData, "serialNumber"),
    expirationDate: parseDate(optionalValue(formData, "expirationDate")),
  });

  const [product, warehouse, unit] = await Promise.all([
    prisma.product.findFirstOrThrow({ where: { id: parsed.productId, companyId: user.companyId, status: "ACTIVE" } }),
    prisma.warehouse.findFirstOrThrow({ where: { id: parsed.warehouseId, companyId: user.companyId, status: "ACTIVE" } }),
    prisma.unitOfMeasure.findFirstOrThrow({ where: { id: parsed.unitId, companyId: user.companyId, status: "ACTIVE" } }),
  ]);

  const location = await assertLocation({
    companyId: user.companyId,
    warehouseId: warehouse.id,
    locationId: parsed.locationId,
  });

  const movement = await prisma.$transaction(async (tx) => {
    const existingStock = await tx.stock.findFirst({
      where: {
        companyId: user.companyId,
        productId: product.id,
        warehouseId: warehouse.id,
        locationId: location?.id ?? null,
        lotNumber: parsed.lotNumber ?? null,
        serialNumber: parsed.serialNumber ?? null,
        expirationDate: parsed.expirationDate ?? null,
      },
    });

    const quantity = parsed.quantity;
    const entryTotalCost = quantity * parsed.unitCost;
    const previousQuantity = decimalToNumber(existingStock?.quantity);
    const previousReserved = decimalToNumber(existingStock?.reservedQuantity);
    const previousTotalCost = decimalToNumber(existingStock?.totalCost);
    const newQuantity = previousQuantity + quantity;
    const newTotalCost = previousTotalCost + entryTotalCost;
    const newAverageCost = newQuantity > 0 ? newTotalCost / newQuantity : parsed.unitCost;

    if (existingStock) {
      await tx.stock.update({
        where: { id: existingStock.id },
        data: {
          quantity: newQuantity,
          availableQuantity: Math.max(newQuantity - previousReserved, 0),
          averageCost: newAverageCost,
          totalCost: newTotalCost,
        },
      });
    } else {
      await tx.stock.create({
        data: {
          companyId: user.companyId,
          productId: product.id,
          warehouseId: warehouse.id,
          locationId: location?.id ?? null,
          lotNumber: parsed.lotNumber ?? null,
          serialNumber: parsed.serialNumber ?? null,
          expirationDate: parsed.expirationDate ?? null,
          quantity: newQuantity,
          reservedQuantity: 0,
          availableQuantity: newQuantity,
          averageCost: newAverageCost,
          totalCost: newTotalCost,
        },
      });
    }

    return tx.inventoryMovement.create({
      data: {
        companyId: user.companyId,
        productId: product.id,
        movementType: "IN",
        movementReason: parsed.movementReason,
        warehouseToId: warehouse.id,
        locationToId: location?.id,
        unitId: unit.id,
        quantity,
        unitCost: parsed.unitCost,
        totalCost: entryTotalCost,
        documentNumber: parsed.documentNumber,
        responsibleUserId: user.id,
        notes: parsed.notes,
      },
    });
  });

  await refreshProductAverageCost(user.companyId, product.id);
  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "inventory.entry.create",
    entity: "InventoryMovement",
    entityId: movement.id,
    newValue: movement,
  });

  revalidatePath("/stock");
  revalidatePath("/movements/entries");
  revalidatePath("/dashboard");
  redirect("/movements/entries?created=1");
}

export async function createOutput(formData: FormData) {
  const user = await requireUser();
  const parsed = movementSchema.omit({ unitCost: true }).parse({
    productId: value(formData, "productId"),
    warehouseId: value(formData, "warehouseId"),
    locationId: optionalValue(formData, "locationId"),
    unitId: value(formData, "unitId"),
    quantity: value(formData, "quantity"),
    documentNumber: optionalValue(formData, "documentNumber"),
    movementReason: value(formData, "movementReason") || "Consumo interno",
    notes: optionalValue(formData, "notes"),
    lotNumber: optionalValue(formData, "lotNumber"),
    serialNumber: optionalValue(formData, "serialNumber"),
    expirationDate: parseDate(optionalValue(formData, "expirationDate")),
  });

  const [company, product, warehouse, unit] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { costingMethod: true } }),
    prisma.product.findFirstOrThrow({ where: { id: parsed.productId, companyId: user.companyId, status: "ACTIVE" } }),
    prisma.warehouse.findFirstOrThrow({ where: { id: parsed.warehouseId, companyId: user.companyId, status: "ACTIVE" } }),
    prisma.unitOfMeasure.findFirstOrThrow({ where: { id: parsed.unitId, companyId: user.companyId, status: "ACTIVE" } }),
  ]);

  const location = await assertLocation({
    companyId: user.companyId,
    warehouseId: warehouse.id,
    locationId: parsed.locationId,
  });

  const movement = await prisma.$transaction(async (tx) => {
    const existingStock = await tx.stock.findFirst({
      where: {
        companyId: user.companyId,
        productId: product.id,
        warehouseId: warehouse.id,
        locationId: location?.id ?? null,
        lotNumber: parsed.lotNumber ?? null,
        serialNumber: parsed.serialNumber ?? null,
        expirationDate: parsed.expirationDate ?? null,
      },
    });

    const availableQuantity = decimalToNumber(existingStock?.availableQuantity);

    if (!existingStock || availableQuantity < parsed.quantity) {
      redirect("/movements/outputs?error=insufficient-stock");
    }

    const currentQuantity = decimalToNumber(existingStock.quantity);
    const reservedQuantity = decimalToNumber(existingStock.reservedQuantity);
    const averageCost = issueUnitCost({
      costingMethod: company.costingMethod,
      stockAverageCost: existingStock.averageCost,
      productAverageCost: product.averageCost,
    });
    const newQuantity = currentQuantity - parsed.quantity;
    const newAvailableQuantity = Math.max(newQuantity - reservedQuantity, 0);
    const totalCost = parsed.quantity * averageCost;

    await tx.stock.update({
      where: { id: existingStock.id },
      data: {
        quantity: newQuantity,
        availableQuantity: newAvailableQuantity,
        totalCost: newQuantity * averageCost,
      },
    });

    return tx.inventoryMovement.create({
      data: {
        companyId: user.companyId,
        productId: product.id,
        movementType: "OUT",
        movementReason: parsed.movementReason,
        warehouseFromId: warehouse.id,
        locationFromId: location?.id,
        unitId: unit.id,
        quantity: parsed.quantity,
        unitCost: averageCost,
        totalCost,
        documentNumber: parsed.documentNumber,
        responsibleUserId: user.id,
        notes: parsed.notes,
      },
    });
  });

  await refreshProductAverageCost(user.companyId, product.id);
  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "inventory.output.create",
    entity: "InventoryMovement",
    entityId: movement.id,
    newValue: movement,
  });

  revalidatePath("/stock");
  revalidatePath("/movements/outputs");
  revalidatePath("/dashboard");
  redirect("/movements/outputs?created=1");
}

export async function createTransfer(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    productId: z.string().min(1),
    warehouseFromId: z.string().min(1),
    locationFromId: z.string().optional(),
    warehouseToId: z.string().min(1),
    locationToId: z.string().optional(),
    unitId: z.string().min(1),
    quantity: z.coerce.number().positive(),
    documentNumber: z.string().max(80).optional(),
    notes: z.string().max(500).optional(),
    lotNumber: z.string().max(80).optional(),
    serialNumber: z.string().max(80).optional(),
    expirationDate: z.date().optional(),
  });

  const parsed = schema.parse({
    productId: value(formData, "productId"),
    warehouseFromId: value(formData, "warehouseFromId"),
    locationFromId: optionalValue(formData, "locationFromId"),
    warehouseToId: value(formData, "warehouseToId"),
    locationToId: optionalValue(formData, "locationToId"),
    unitId: value(formData, "unitId"),
    quantity: value(formData, "quantity"),
    documentNumber: optionalValue(formData, "documentNumber"),
    notes: optionalValue(formData, "notes"),
    lotNumber: optionalValue(formData, "lotNumber"),
    serialNumber: optionalValue(formData, "serialNumber"),
    expirationDate: parseDate(optionalValue(formData, "expirationDate")),
  });

  if (parsed.warehouseFromId === parsed.warehouseToId && parsed.locationFromId === parsed.locationToId) {
    redirect("/movements/transfers?error=same-location");
  }

  const [company, product, warehouseFrom, warehouseTo, unit] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { costingMethod: true } }),
    prisma.product.findFirstOrThrow({ where: { id: parsed.productId, companyId: user.companyId, status: "ACTIVE" } }),
    prisma.warehouse.findFirstOrThrow({ where: { id: parsed.warehouseFromId, companyId: user.companyId, status: "ACTIVE" } }),
    prisma.warehouse.findFirstOrThrow({ where: { id: parsed.warehouseToId, companyId: user.companyId, status: "ACTIVE" } }),
    prisma.unitOfMeasure.findFirstOrThrow({ where: { id: parsed.unitId, companyId: user.companyId, status: "ACTIVE" } }),
  ]);

  const [locationFrom, locationTo] = await Promise.all([
    assertLocation({ companyId: user.companyId, warehouseId: warehouseFrom.id, locationId: parsed.locationFromId }),
    assertLocation({ companyId: user.companyId, warehouseId: warehouseTo.id, locationId: parsed.locationToId }),
  ]);

  const movement = await prisma.$transaction(async (tx) => {
    const sourceStock = await tx.stock.findFirst({
      where: {
        companyId: user.companyId,
        productId: product.id,
        warehouseId: warehouseFrom.id,
        locationId: locationFrom?.id ?? null,
        lotNumber: parsed.lotNumber ?? null,
        serialNumber: parsed.serialNumber ?? null,
        expirationDate: parsed.expirationDate ?? null,
      },
    });

    const availableQuantity = decimalToNumber(sourceStock?.availableQuantity);
    if (!sourceStock || availableQuantity < parsed.quantity) {
      redirect("/movements/transfers?error=insufficient-stock");
    }

    const averageCost = issueUnitCost({
      costingMethod: company.costingMethod,
      stockAverageCost: sourceStock.averageCost,
      productAverageCost: product.averageCost,
    });
    const sourceQuantity = decimalToNumber(sourceStock.quantity);
    const sourceReserved = decimalToNumber(sourceStock.reservedQuantity);
    const nextSourceQuantity = sourceQuantity - parsed.quantity;

    await tx.stock.update({
      where: { id: sourceStock.id },
      data: {
        quantity: nextSourceQuantity,
        availableQuantity: Math.max(nextSourceQuantity - sourceReserved, 0),
        totalCost: nextSourceQuantity * averageCost,
      },
    });

    const targetStock = await tx.stock.findFirst({
      where: {
        companyId: user.companyId,
        productId: product.id,
        warehouseId: warehouseTo.id,
        locationId: locationTo?.id ?? null,
        lotNumber: parsed.lotNumber ?? null,
        serialNumber: parsed.serialNumber ?? null,
        expirationDate: parsed.expirationDate ?? null,
      },
    });

    if (targetStock) {
      const targetQuantity = decimalToNumber(targetStock.quantity);
      const targetReserved = decimalToNumber(targetStock.reservedQuantity);
      const targetTotalCost = decimalToNumber(targetStock.totalCost);
      const nextTargetQuantity = targetQuantity + parsed.quantity;
      const nextTargetTotalCost = targetTotalCost + parsed.quantity * averageCost;

      await tx.stock.update({
        where: { id: targetStock.id },
        data: {
          quantity: nextTargetQuantity,
          availableQuantity: Math.max(nextTargetQuantity - targetReserved, 0),
          averageCost: nextTargetQuantity > 0 ? nextTargetTotalCost / nextTargetQuantity : averageCost,
          totalCost: nextTargetTotalCost,
        },
      });
    } else {
      await tx.stock.create({
        data: {
          companyId: user.companyId,
          productId: product.id,
          warehouseId: warehouseTo.id,
          locationId: locationTo?.id ?? null,
          lotNumber: parsed.lotNumber ?? null,
          serialNumber: parsed.serialNumber ?? null,
          expirationDate: parsed.expirationDate ?? null,
          quantity: parsed.quantity,
          reservedQuantity: 0,
          availableQuantity: parsed.quantity,
          averageCost,
          totalCost: parsed.quantity * averageCost,
        },
      });
    }

    return tx.inventoryMovement.create({
      data: {
        companyId: user.companyId,
        productId: product.id,
        movementType: "TRANSFER",
        movementReason: "Transferencia",
        warehouseFromId: warehouseFrom.id,
        locationFromId: locationFrom?.id,
        warehouseToId: warehouseTo.id,
        locationToId: locationTo?.id,
        unitId: unit.id,
        quantity: parsed.quantity,
        unitCost: averageCost,
        totalCost: parsed.quantity * averageCost,
        documentNumber: parsed.documentNumber,
        responsibleUserId: user.id,
        approvedByUserId: user.id,
        notes: parsed.notes,
      },
    });
  });

  await refreshProductAverageCost(user.companyId, product.id);
  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "inventory.transfer.create",
    entity: "InventoryMovement",
    entityId: movement.id,
    newValue: movement,
  });

  revalidatePath("/stock");
  revalidatePath("/movements/transfers");
  revalidatePath("/dashboard");
  redirect("/movements/transfers?created=1");
}

export async function createAdjustment(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    productId: z.string().min(1),
    warehouseId: z.string().min(1),
    locationId: z.string().optional(),
    unitId: z.string().min(1),
    adjustmentType: z.enum(["POSITIVE", "NEGATIVE"]),
    quantity: z.coerce.number().positive(),
    unitCost: z.coerce.number().min(0).default(0),
    movementReason: z.string().min(2).max(100),
    documentNumber: z.string().max(80).optional(),
    notes: z.string().max(500).optional(),
    lotNumber: z.string().max(80).optional(),
    serialNumber: z.string().max(80).optional(),
    expirationDate: z.date().optional(),
  });

  const parsed = schema.parse({
    productId: value(formData, "productId"),
    warehouseId: value(formData, "warehouseId"),
    locationId: optionalValue(formData, "locationId"),
    unitId: value(formData, "unitId"),
    adjustmentType: value(formData, "adjustmentType") || "POSITIVE",
    quantity: value(formData, "quantity"),
    unitCost: value(formData, "unitCost") || "0",
    movementReason: value(formData, "movementReason") || "Correccion de registro",
    documentNumber: optionalValue(formData, "documentNumber"),
    notes: optionalValue(formData, "notes"),
    lotNumber: optionalValue(formData, "lotNumber"),
    serialNumber: optionalValue(formData, "serialNumber"),
    expirationDate: parseDate(optionalValue(formData, "expirationDate")),
  });

  const [company, product, warehouse, unit] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { costingMethod: true } }),
    prisma.product.findFirstOrThrow({ where: { id: parsed.productId, companyId: user.companyId, status: "ACTIVE" } }),
    prisma.warehouse.findFirstOrThrow({ where: { id: parsed.warehouseId, companyId: user.companyId, status: "ACTIVE" } }),
    prisma.unitOfMeasure.findFirstOrThrow({ where: { id: parsed.unitId, companyId: user.companyId, status: "ACTIVE" } }),
  ]);

  const location = await assertLocation({
    companyId: user.companyId,
    warehouseId: warehouse.id,
    locationId: parsed.locationId,
  });

  const movement = await prisma.$transaction(async (tx) => {
    const existingStock = await tx.stock.findFirst({
      where: {
        companyId: user.companyId,
        productId: product.id,
        warehouseId: warehouse.id,
        locationId: location?.id ?? null,
        lotNumber: parsed.lotNumber ?? null,
        serialNumber: parsed.serialNumber ?? null,
        expirationDate: parsed.expirationDate ?? null,
      },
    });

    const currentQuantity = decimalToNumber(existingStock?.quantity);
    const reservedQuantity = decimalToNumber(existingStock?.reservedQuantity);
    const currentAverageCost = issueUnitCost({
      costingMethod: company.costingMethod,
      stockAverageCost: existingStock?.averageCost,
      productAverageCost: product.averageCost,
      fallbackCost: parsed.unitCost,
    });
    const unitCost = parsed.unitCost > 0 ? parsed.unitCost : currentAverageCost;
    const isPositive = parsed.adjustmentType === "POSITIVE";

    if (!isPositive && (!existingStock || decimalToNumber(existingStock.availableQuantity) < parsed.quantity)) {
      redirect("/movements/adjustments?error=insufficient-stock");
    }

    const nextQuantity = isPositive ? currentQuantity + parsed.quantity : currentQuantity - parsed.quantity;
    const nextTotalCost = nextQuantity * unitCost;

    if (existingStock) {
      await tx.stock.update({
        where: { id: existingStock.id },
        data: {
          quantity: nextQuantity,
          availableQuantity: Math.max(nextQuantity - reservedQuantity, 0),
          averageCost: unitCost,
          totalCost: nextTotalCost,
        },
      });
    } else {
      await tx.stock.create({
        data: {
          companyId: user.companyId,
          productId: product.id,
          warehouseId: warehouse.id,
          locationId: location?.id ?? null,
          lotNumber: parsed.lotNumber ?? null,
          serialNumber: parsed.serialNumber ?? null,
          expirationDate: parsed.expirationDate ?? null,
          quantity: nextQuantity,
          reservedQuantity: 0,
          availableQuantity: nextQuantity,
          averageCost: unitCost,
          totalCost: nextTotalCost,
        },
      });
    }

    return tx.inventoryMovement.create({
      data: {
        companyId: user.companyId,
        productId: product.id,
        movementType: "ADJUSTMENT",
        movementReason: `${isPositive ? "Ajuste positivo" : "Ajuste negativo"}: ${parsed.movementReason}`,
        warehouseFromId: isPositive ? undefined : warehouse.id,
        locationFromId: isPositive ? undefined : location?.id,
        warehouseToId: isPositive ? warehouse.id : undefined,
        locationToId: isPositive ? location?.id : undefined,
        unitId: unit.id,
        quantity: parsed.quantity,
        unitCost,
        totalCost: parsed.quantity * unitCost,
        documentNumber: parsed.documentNumber,
        responsibleUserId: user.id,
        approvedByUserId: user.id,
        notes: parsed.notes,
      },
    });
  });

  await refreshProductAverageCost(user.companyId, product.id);
  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "inventory.adjustment.create",
    entity: "InventoryMovement",
    entityId: movement.id,
    newValue: movement,
  });

  revalidatePath("/stock");
  revalidatePath("/movements/adjustments");
  revalidatePath("/dashboard");
  redirect("/movements/adjustments?created=1");
}
