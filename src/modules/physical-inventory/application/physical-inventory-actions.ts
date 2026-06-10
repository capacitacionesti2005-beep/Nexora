"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function safeReturnPath(raw?: string) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

async function saveEvidenceImage(file: FormDataEntryValue | null, itemId: string) {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) return undefined;

  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  if (!allowedExtensions.has(ext)) return undefined;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "physical-inventory");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${itemId}-${Date.now()}${ext}`;
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/physical-inventory/${fileName}`;
}

export async function createPhysicalInventory(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    code: z.string().min(2).max(60),
    name: z.string().min(2).max(160),
    warehouseId: z.string().optional(),
    categoryId: z.string().optional(),
    isBlindCount: z.boolean().default(false),
    notes: z.string().max(500).optional(),
  });

  const data = schema.parse({
    code: value(formData, "code").toUpperCase(),
    name: value(formData, "name"),
    warehouseId: optionalValue(formData, "warehouseId"),
    categoryId: optionalValue(formData, "categoryId"),
    isBlindCount: formData.get("isBlindCount") === "on",
    notes: optionalValue(formData, "notes"),
  });

  const stocks = await prisma.stock.findMany({
    where: {
      companyId: user.companyId,
      warehouseId: data.warehouseId,
      product: data.categoryId ? { categoryId: data.categoryId } : undefined,
    },
    include: { product: true },
  });

  const inventory = await prisma.physicalInventory.create({
    data: {
      companyId: user.companyId,
      code: data.code,
      name: data.name,
      warehouseId: data.warehouseId,
      categoryId: data.categoryId,
      responsibleUserId: user.id,
      status: "COUNTING",
      startDate: new Date(),
      isBlindCount: data.isBlindCount,
      notes: data.notes,
      items: {
        create: stocks.map((stock) => ({
          productId: stock.productId,
          warehouseId: stock.warehouseId,
          locationId: stock.locationId,
          lotNumber: stock.lotNumber,
          serialNumber: stock.serialNumber,
          expirationDate: stock.expirationDate,
          systemQuantity: stock.quantity,
          unitId: stock.product.baseUnitId,
          responsibleUserId: user.id,
          status: "PENDING",
        })),
      },
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "physicalInventory.create",
    entity: "PhysicalInventory",
    entityId: inventory.id,
    newValue: inventory,
  });

  revalidatePath("/physical-inventory");
  redirect(`/physical-inventory?inventoryId=${inventory.id}&created=1`);
}

export async function countPhysicalInventoryItem(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    itemId: z.string().min(1),
    countedQuantity: z.coerce.number().min(0),
    notes: z.string().max(300).optional(),
    countSource: z.enum(["MANUAL", "QR"]).default("MANUAL"),
    returnTo: z.string().optional(),
  });

  const data = schema.parse({
    itemId: value(formData, "itemId"),
    countedQuantity: value(formData, "countedQuantity"),
    notes: optionalValue(formData, "notes"),
    countSource: value(formData, "countSource") === "QR" ? "QR" : "MANUAL",
    returnTo: optionalValue(formData, "returnTo"),
  });

  const item = await prisma.physicalInventoryItem.findFirstOrThrow({
    where: { id: data.itemId, physicalInventory: { companyId: user.companyId } },
    include: { physicalInventory: true },
  });
  const evidenceImageUrl = await saveEvidenceImage(formData.get("evidenceImage"), item.id);

  const systemQuantity = decimalToNumber(item.systemQuantity);
  const updatedItem = await prisma.physicalInventoryItem.update({
    where: { id: item.id },
    data: {
      countedQuantity: data.countedQuantity,
      difference: data.countedQuantity - systemQuantity,
      notes: data.notes,
      evidenceImageUrl,
      countSource: data.countSource,
      responsibleUserId: user.id,
      countedAt: new Date(),
      status: "COUNTED",
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "physicalInventory.item.count",
    entity: "PhysicalInventoryItem",
    entityId: item.id,
    oldValue: {
      countedQuantity: item.countedQuantity,
      difference: item.difference,
      notes: item.notes,
      evidenceImageUrl: item.evidenceImageUrl,
      status: item.status,
    },
    newValue: {
      countedQuantity: updatedItem.countedQuantity,
      difference: updatedItem.difference,
      notes: updatedItem.notes,
      evidenceImageUrl: updatedItem.evidenceImageUrl,
      countSource: updatedItem.countSource,
      status: updatedItem.status,
    },
  });

  const pendingItems = await prisma.physicalInventoryItem.count({
    where: {
      physicalInventoryId: item.physicalInventoryId,
      status: "PENDING",
    },
  });

  if (pendingItems === 0 && item.physicalInventory.status === "COUNTING") {
    await prisma.physicalInventory.update({
      where: { id: item.physicalInventoryId },
      data: { status: "REVIEW" },
    });
  }

  revalidatePath("/physical-inventory");
  if (item.locationId) revalidatePath(`/locations/${item.locationId}/scan`);
  const returnTo = safeReturnPath(data.returnTo);
  if (returnTo) redirect(returnTo);
}

export async function importPhysicalInventoryCounts(formData: FormData) {
  const user = await requireUser();
  const inventoryId = value(formData, "inventoryId");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/physical-inventory?inventoryId=${inventoryId}&error=file-required`);
  }

  const inventory = await prisma.physicalInventory.findFirstOrThrow({
    where: { id: inventoryId, companyId: user.companyId },
  });
  const rows = parseCsv(await file.text());
  let imported = 0;

  for (const row of rows) {
    const itemId = (row.itemId ?? "").trim();
    const countedQuantity = Number((row.countedQuantity ?? "").trim());
    if (!itemId || Number.isNaN(countedQuantity) || countedQuantity < 0) continue;

    const item = await prisma.physicalInventoryItem.findFirst({
      where: { id: itemId, physicalInventoryId: inventory.id },
    });
    if (!item) continue;

    await prisma.physicalInventoryItem.update({
      where: { id: item.id },
      data: {
        countedQuantity,
        difference: countedQuantity - decimalToNumber(item.systemQuantity),
        notes: (row.notes ?? "").trim() || item.notes,
        countSource: "CSV",
        responsibleUserId: user.id,
        countedAt: new Date(),
        status: "COUNTED",
      },
    });
    imported += 1;
  }

  const pendingItems = await prisma.physicalInventoryItem.count({
    where: { physicalInventoryId: inventory.id, status: "PENDING" },
  });

  if (pendingItems === 0 && inventory.status === "COUNTING") {
    await prisma.physicalInventory.update({
      where: { id: inventory.id },
      data: { status: "REVIEW" },
    });
  }

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "physicalInventory.counts.import",
    entity: "PhysicalInventory",
    entityId: inventory.id,
    newValue: { imported },
  });

  revalidatePath("/physical-inventory");
  redirect(`/physical-inventory?inventoryId=${inventory.id}&countsImported=${imported}`);
}

export async function approvePhysicalInventory(formData: FormData) {
  const user = await requireUser();
  const inventoryId = value(formData, "inventoryId");
  const inventory = await prisma.physicalInventory.findFirstOrThrow({
    where: { id: inventoryId, companyId: user.companyId },
    include: { items: { include: { product: true, unit: true } } },
  });

  const pendingItems = inventory.items.filter((item) => item.countedQuantity === null);
  if (pendingItems.length > 0) {
    redirect(`/physical-inventory?inventoryId=${inventory.id}&error=pending-counts`);
  }

  await prisma.$transaction(async (tx) => {
    for (const item of inventory.items) {
      const difference = decimalToNumber(item.difference);
      if (difference === 0 || item.countedQuantity === null) continue;

      const stock = await tx.stock.findFirst({
        where: {
          companyId: user.companyId,
          productId: item.productId,
          warehouseId: item.warehouseId,
          locationId: item.locationId ?? null,
          lotNumber: item.lotNumber ?? null,
          serialNumber: item.serialNumber ?? null,
          expirationDate: item.expirationDate ?? null,
        },
      });

      const currentQuantity = decimalToNumber(stock?.quantity);
      const currentAverageCost = decimalToNumber(stock?.averageCost || item.product.averageCost);
      const nextQuantity = currentQuantity + difference;

      if (stock) {
        await tx.stock.update({
          where: { id: stock.id },
          data: {
            quantity: nextQuantity,
            availableQuantity: nextQuantity,
            totalCost: nextQuantity * currentAverageCost,
          },
        });
      } else if (difference > 0) {
        await tx.stock.create({
          data: {
            companyId: user.companyId,
            productId: item.productId,
            warehouseId: item.warehouseId,
            locationId: item.locationId,
            lotNumber: item.lotNumber,
            serialNumber: item.serialNumber,
            expirationDate: item.expirationDate,
            quantity: difference,
            reservedQuantity: 0,
            availableQuantity: difference,
            averageCost: currentAverageCost,
            totalCost: difference * currentAverageCost,
          },
        });
      }

      await tx.inventoryMovement.create({
        data: {
          companyId: user.companyId,
          productId: item.productId,
          movementType: "ADJUSTMENT",
          movementReason: "Diferencia inventario fisico",
          warehouseFromId: difference < 0 ? item.warehouseId : undefined,
          locationFromId: difference < 0 ? item.locationId : undefined,
          warehouseToId: difference > 0 ? item.warehouseId : undefined,
          locationToId: difference > 0 ? item.locationId : undefined,
          unitId: item.unitId,
          quantity: Math.abs(difference),
          unitCost: currentAverageCost,
          totalCost: Math.abs(difference) * currentAverageCost,
          documentNumber: inventory.code,
          responsibleUserId: user.id,
          approvedByUserId: user.id,
          notes: `Ajuste automatico por inventario fisico ${inventory.code}`,
        },
      });

      await tx.physicalInventoryItem.update({
        where: { id: item.id },
        data: { status: "ADJUSTED" },
      });
    }

    await tx.physicalInventory.update({
      where: { id: inventory.id },
      data: { status: "ADJUSTED", endDate: new Date() },
    });
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "physicalInventory.approve",
    entity: "PhysicalInventory",
    entityId: inventory.id,
    newValue: { id: inventory.id, code: inventory.code },
  });

  revalidatePath("/physical-inventory");
  revalidatePath("/stock");
  revalidatePath("/dashboard");
  redirect(`/physical-inventory?inventoryId=${inventory.id}&approved=1`);
}
