"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { WarehouseType } from "@prisma/client";
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

async function saveProductImage(file: FormDataEntryValue | null, productId: string) {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (file.size > 5 * 1024 * 1024) {
    redirect("/products/new?error=image-size");
  }

  if (!file.type.startsWith("image/")) {
    redirect("/products/new?error=image-type");
  }

  const ext = path.extname(file.name).toLowerCase() || ".png";
  const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  if (!allowedExtensions.has(ext)) {
    redirect("/products/new?error=image-type");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${productId}-${Date.now()}${ext}`;
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/products/${fileName}`;
}

const statusSchema = z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE");

export async function createCategory(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    code: z.string().max(40).optional(),
    name: z.string().min(2).max(120),
    description: z.string().max(500).optional(),
    parentId: z.string().optional(),
    status: statusSchema,
  });

  const data = schema.parse({
    code: optionalValue(formData, "code"),
    name: value(formData, "name"),
    description: optionalValue(formData, "description"),
    parentId: optionalValue(formData, "parentId"),
    status: value(formData, "status") || "ACTIVE",
  });

  const category = await prisma.category.create({
    data: {
      ...data,
      companyId: user.companyId,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "category.create",
    entity: "Category",
    entityId: category.id,
    newValue: category,
  });

  revalidatePath("/categories");
}

export async function createUnit(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    name: z.string().min(2).max(80),
    abbreviation: z.string().min(1).max(20),
    type: z.string().min(2).max(60),
    status: statusSchema,
  });

  const data = schema.parse({
    name: value(formData, "name"),
    abbreviation: value(formData, "abbreviation").toUpperCase(),
    type: value(formData, "type"),
    status: value(formData, "status") || "ACTIVE",
  });

  const unit = await prisma.unitOfMeasure.create({
    data: {
      ...data,
      companyId: user.companyId,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "unit.create",
    entity: "UnitOfMeasure",
    entityId: unit.id,
    newValue: unit,
  });

  revalidatePath("/units");
}

export async function createWarehouse(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    code: z.string().min(2).max(40),
    name: z.string().min(2).max(120),
    type: z.nativeEnum(WarehouseType),
    address: z.string().max(180).optional(),
    city: z.string().max(80).optional(),
    notes: z.string().max(500).optional(),
    status: statusSchema,
  });

  const data = schema.parse({
    code: value(formData, "code").toUpperCase(),
    name: value(formData, "name"),
    type: value(formData, "type") || "MAIN",
    address: optionalValue(formData, "address"),
    city: optionalValue(formData, "city"),
    notes: optionalValue(formData, "notes"),
    status: value(formData, "status") || "ACTIVE",
  });

  const warehouse = await prisma.warehouse.create({
    data: {
      ...data,
      companyId: user.companyId,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "warehouse.create",
    entity: "Warehouse",
    entityId: warehouse.id,
    newValue: warehouse,
  });

  revalidatePath("/warehouses");
}

export async function createLocation(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    warehouseId: z.string().min(1),
    locationCode: z.string().min(2).max(80),
    zone: z.string().max(60).optional(),
    aisle: z.string().max(40).optional(),
    shelf: z.string().max(40).optional(),
    level: z.string().max(40).optional(),
    position: z.string().max(40).optional(),
    description: z.string().max(500).optional(),
    status: statusSchema,
  });

  const data = schema.parse({
    warehouseId: value(formData, "warehouseId"),
    locationCode: value(formData, "locationCode").toUpperCase(),
    zone: optionalValue(formData, "zone"),
    aisle: optionalValue(formData, "aisle"),
    shelf: optionalValue(formData, "shelf"),
    level: optionalValue(formData, "level"),
    position: optionalValue(formData, "position"),
    description: optionalValue(formData, "description"),
    status: value(formData, "status") || "ACTIVE",
  });

  const warehouse = await prisma.warehouse.findFirstOrThrow({
    where: {
      id: data.warehouseId,
      companyId: user.companyId,
    },
  });

  const location = await prisma.location.create({
    data: {
      ...data,
      companyId: user.companyId,
      warehouseId: warehouse.id,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "location.create",
    entity: "Location",
    entityId: location.id,
    newValue: location,
  });

  revalidatePath("/locations");
}

export async function createProduct(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    internalCode: z.string().min(2).max(60),
    barcode: z.string().max(80).optional(),
    sku: z.string().max(80).optional(),
    name: z.string().min(2).max(180),
    description: z.string().max(1000).optional(),
    categoryId: z.string().optional(),
    brand: z.string().max(80).optional(),
    model: z.string().max(80).optional(),
    baseUnitId: z.string().min(1),
    purchaseUnitId: z.string().optional(),
    saleUnitId: z.string().optional(),
    conversionFactor: z.coerce.number().positive().default(1),
    unitCost: z.coerce.number().min(0).default(0),
    averageCost: z.coerce.number().min(0).default(0),
    minStock: z.coerce.number().min(0).default(0),
    maxStock: z.coerce.number().min(0).default(0),
    reorderPoint: z.coerce.number().min(0).default(0),
    isPerishable: z.boolean().default(false),
    managesLot: z.boolean().default(false),
    managesSerial: z.boolean().default(false),
    managesExpirationDate: z.boolean().default(false),
    status: statusSchema,
  });

  const data = schema.parse({
    internalCode: value(formData, "internalCode").toUpperCase(),
    barcode: optionalValue(formData, "barcode"),
    sku: optionalValue(formData, "sku"),
    name: value(formData, "name"),
    description: optionalValue(formData, "description"),
    categoryId: optionalValue(formData, "categoryId"),
    brand: optionalValue(formData, "brand"),
    model: optionalValue(formData, "model"),
    baseUnitId: value(formData, "baseUnitId"),
    purchaseUnitId: optionalValue(formData, "purchaseUnitId"),
    saleUnitId: optionalValue(formData, "saleUnitId"),
    conversionFactor: value(formData, "conversionFactor") || "1",
    unitCost: value(formData, "unitCost") || "0",
    averageCost: value(formData, "averageCost") || value(formData, "unitCost") || "0",
    minStock: value(formData, "minStock") || "0",
    maxStock: value(formData, "maxStock") || "0",
    reorderPoint: value(formData, "reorderPoint") || "0",
    isPerishable: formData.get("isPerishable") === "on",
    managesLot: formData.get("managesLot") === "on",
    managesSerial: formData.get("managesSerial") === "on",
    managesExpirationDate: formData.get("managesExpirationDate") === "on",
    status: value(formData, "status") || "ACTIVE",
  });

  const [company, baseUnit, category, purchaseUnit, saleUnit] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { skuRequired: true, barcodeRequired: true },
    }),
    prisma.unitOfMeasure.findFirstOrThrow({
      where: { id: data.baseUnitId, companyId: user.companyId },
    }),
    data.categoryId
      ? prisma.category.findFirstOrThrow({ where: { id: data.categoryId, companyId: user.companyId } })
      : Promise.resolve(null),
    data.purchaseUnitId
      ? prisma.unitOfMeasure.findFirstOrThrow({ where: { id: data.purchaseUnitId, companyId: user.companyId } })
      : Promise.resolve(null),
    data.saleUnitId
      ? prisma.unitOfMeasure.findFirstOrThrow({ where: { id: data.saleUnitId, companyId: user.companyId } })
      : Promise.resolve(null),
  ]);

  if (company.skuRequired && !data.sku) {
    redirect("/products/new?error=sku-required");
  }

  if (company.barcodeRequired && !data.barcode) {
    redirect("/products/new?error=barcode-required");
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      companyId: user.companyId,
      baseUnitId: baseUnit.id,
      categoryId: category?.id,
      purchaseUnitId: purchaseUnit?.id,
      saleUnitId: saleUnit?.id,
      qrCode: data.internalCode,
    },
  });

  const imageUrl = await saveProductImage(formData.get("image"), product.id);
  const savedProduct = imageUrl
    ? await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl },
      })
    : product;

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "product.create",
    entity: "Product",
    entityId: product.id,
    newValue: savedProduct,
  });

  revalidatePath("/products");
  redirect("/products");
}

export async function createUnitConversion(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    productId: z.string().min(1),
    fromUnitId: z.string().min(1),
    toUnitId: z.string().min(1),
    factor: z.coerce.number().positive(),
    status: statusSchema,
  });

  const data = schema.parse({
    productId: value(formData, "productId"),
    fromUnitId: value(formData, "fromUnitId"),
    toUnitId: value(formData, "toUnitId"),
    factor: value(formData, "factor"),
    status: value(formData, "status") || "ACTIVE",
  });

  if (data.fromUnitId === data.toUnitId) {
    redirect("/units/conversions?error=same-unit");
  }

  const [product, fromUnit, toUnit] = await Promise.all([
    prisma.product.findFirstOrThrow({ where: { id: data.productId, companyId: user.companyId } }),
    prisma.unitOfMeasure.findFirstOrThrow({ where: { id: data.fromUnitId, companyId: user.companyId } }),
    prisma.unitOfMeasure.findFirstOrThrow({ where: { id: data.toUnitId, companyId: user.companyId } }),
  ]);

  const conversion = await prisma.unitConversion.create({
    data: {
      companyId: user.companyId,
      productId: product.id,
      fromUnitId: fromUnit.id,
      toUnitId: toUnit.id,
      factor: data.factor,
      status: data.status,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "unitConversion.create",
    entity: "UnitConversion",
    entityId: conversion.id,
    newValue: conversion,
  });

  revalidatePath("/units/conversions");
  redirect("/units/conversions?created=1");
}
