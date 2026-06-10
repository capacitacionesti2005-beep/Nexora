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

const statusSchema = z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE");

export async function createSupplier(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    code: z.string().min(2).max(40),
    name: z.string().min(2).max(160),
    taxId: z.string().max(80).optional(),
    contactName: z.string().max(120).optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(60).optional(),
    city: z.string().max(80).optional(),
    leadTimeDays: z.coerce.number().int().min(0).max(365),
    notes: z.string().max(500).optional(),
    status: statusSchema,
  });

  const data = schema.parse({
    code: value(formData, "code").toUpperCase(),
    name: value(formData, "name"),
    taxId: optionalValue(formData, "taxId"),
    contactName: optionalValue(formData, "contactName"),
    email: value(formData, "email"),
    phone: optionalValue(formData, "phone"),
    city: optionalValue(formData, "city"),
    leadTimeDays: value(formData, "leadTimeDays") || "0",
    notes: optionalValue(formData, "notes"),
    status: value(formData, "status") || "ACTIVE",
  });

  const supplier = await prisma.supplier.create({
    data: {
      ...data,
      email: data.email || null,
      companyId: user.companyId,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "supplier.create",
    entity: "Supplier",
    entityId: supplier.id,
    newValue: supplier,
  });

  revalidatePath("/suppliers");
  redirect("/suppliers?created=1");
}

export async function linkProductSupplier(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    productId: z.string().min(1),
    supplierId: z.string().min(1),
    supplierSku: z.string().max(80).optional(),
    purchaseUnitId: z.string().optional(),
    minPurchaseQuantity: z.coerce.number().min(0),
    purchaseMultiple: z.coerce.number().positive(),
    lastPurchaseCost: z.coerce.number().min(0),
    leadTimeDays: z.coerce.number().int().min(0).max(365).optional(),
    isPrimary: z.boolean().default(false),
    status: statusSchema,
  });

  const data = schema.parse({
    productId: value(formData, "productId"),
    supplierId: value(formData, "supplierId"),
    supplierSku: optionalValue(formData, "supplierSku"),
    purchaseUnitId: optionalValue(formData, "purchaseUnitId"),
    minPurchaseQuantity: value(formData, "minPurchaseQuantity") || "0",
    purchaseMultiple: value(formData, "purchaseMultiple") || "1",
    lastPurchaseCost: value(formData, "lastPurchaseCost") || "0",
    leadTimeDays: optionalValue(formData, "leadTimeDays"),
    isPrimary: formData.get("isPrimary") === "on",
    status: value(formData, "status") || "ACTIVE",
  });

  const [product, supplier, purchaseUnit] = await Promise.all([
    prisma.product.findFirstOrThrow({ where: { id: data.productId, companyId: user.companyId } }),
    prisma.supplier.findFirstOrThrow({ where: { id: data.supplierId, companyId: user.companyId } }),
    data.purchaseUnitId
      ? prisma.unitOfMeasure.findFirstOrThrow({ where: { id: data.purchaseUnitId, companyId: user.companyId } })
      : Promise.resolve(null),
  ]);

  if (data.isPrimary) {
    await prisma.productSupplier.updateMany({
      where: { companyId: user.companyId, productId: product.id },
      data: { isPrimary: false },
    });
  }

  const productSupplier = await prisma.productSupplier.upsert({
    where: {
      companyId_productId_supplierId: {
        companyId: user.companyId,
        productId: product.id,
        supplierId: supplier.id,
      },
    },
    create: {
      companyId: user.companyId,
      productId: product.id,
      supplierId: supplier.id,
      supplierSku: data.supplierSku,
      purchaseUnitId: purchaseUnit?.id,
      minPurchaseQuantity: data.minPurchaseQuantity,
      purchaseMultiple: data.purchaseMultiple,
      lastPurchaseCost: data.lastPurchaseCost,
      leadTimeDays: data.leadTimeDays,
      isPrimary: data.isPrimary,
      status: data.status,
    },
    update: {
      supplierSku: data.supplierSku,
      purchaseUnitId: purchaseUnit?.id,
      minPurchaseQuantity: data.minPurchaseQuantity,
      purchaseMultiple: data.purchaseMultiple,
      lastPurchaseCost: data.lastPurchaseCost,
      leadTimeDays: data.leadTimeDays,
      isPrimary: data.isPrimary,
      status: data.status,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "productSupplier.upsert",
    entity: "ProductSupplier",
    entityId: productSupplier.id,
    newValue: productSupplier,
  });

  revalidatePath(`/products/${product.id}`);
  revalidatePath("/replenishment");
  redirect(`/products/${product.id}?supplierSaved=1`);
}

export async function upsertProductWarehouseSetting(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    productId: z.string().min(1),
    warehouseId: z.string().min(1),
    minStock: z.coerce.number().min(0),
    maxStock: z.coerce.number().min(0),
    reorderPoint: z.coerce.number().min(0),
    status: statusSchema,
  });

  const data = schema.parse({
    productId: value(formData, "productId"),
    warehouseId: value(formData, "warehouseId"),
    minStock: value(formData, "minStock") || "0",
    maxStock: value(formData, "maxStock") || "0",
    reorderPoint: value(formData, "reorderPoint") || "0",
    status: value(formData, "status") || "ACTIVE",
  });

  const [product, warehouse] = await Promise.all([
    prisma.product.findFirstOrThrow({ where: { id: data.productId, companyId: user.companyId } }),
    prisma.warehouse.findFirstOrThrow({ where: { id: data.warehouseId, companyId: user.companyId } }),
  ]);

  const setting = await prisma.productWarehouseSetting.upsert({
    where: {
      companyId_productId_warehouseId: {
        companyId: user.companyId,
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
    create: {
      companyId: user.companyId,
      productId: product.id,
      warehouseId: warehouse.id,
      minStock: data.minStock,
      maxStock: data.maxStock,
      reorderPoint: data.reorderPoint,
      status: data.status,
    },
    update: {
      minStock: data.minStock,
      maxStock: data.maxStock,
      reorderPoint: data.reorderPoint,
      status: data.status,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "productWarehouseSetting.upsert",
    entity: "ProductWarehouseSetting",
    entityId: setting.id,
    newValue: setting,
  });

  revalidatePath(`/products/${product.id}`);
  revalidatePath("/replenishment");
  redirect(`/products/${product.id}?warehouseSettingSaved=1`);
}

export async function uploadProductImage(formData: FormData) {
  const user = await requireUser();
  const productId = value(formData, "productId");
  const product = await prisma.product.findFirstOrThrow({
    where: { id: productId, companyId: user.companyId },
  });

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/products/${product.id}?error=image-required`);
  }

  if (file.size > 5 * 1024 * 1024) {
    redirect(`/products/${product.id}?error=image-size`);
  }

  if (!file.type.startsWith("image/")) {
    redirect(`/products/${product.id}?error=image-type`);
  }

  const ext = path.extname(file.name).toLowerCase() || ".png";
  const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  if (!allowedExtensions.has(ext)) {
    redirect(`/products/${product.id}?error=image-type`);
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${product.id}-${Date.now()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, fileName), bytes);

  const updatedProduct = await prisma.product.update({
    where: { id: product.id },
    data: { imageUrl: `/uploads/products/${fileName}` },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "product.image.upload",
    entity: "Product",
    entityId: product.id,
    newValue: { imageUrl: updatedProduct.imageUrl },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${product.id}`);
  redirect(`/products/${product.id}?imageSaved=1`);
}
