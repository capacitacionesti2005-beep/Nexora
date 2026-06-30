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

export async function updateCompanySettings(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    name: z.string().min(2).max(160),
    taxId: z.string().min(2).max(80),
    sector: z.string().max(80).optional(),
    address: z.string().max(180).optional(),
    city: z.string().max(80).optional(),
    country: z.string().min(2).max(80),
    currency: z.string().min(3).max(8),
    logoUrl: z.string().url().optional().or(z.literal("")),
    uiTheme: z.enum(["light", "dark", "system"]),
    uiDensity: z.enum(["comfortable", "compact"]),
    accentColor: z.enum(["emerald", "blue", "cyan", "violet"]),
    quantityDecimals: z.coerce.number().int().min(0).max(6),
    costDecimals: z.coerce.number().int().min(0).max(6),
    costingMethod: z.enum(["AVERAGE", "FIFO", "STANDARD"]),
    skuRequired: z.boolean().default(false),
    barcodeRequired: z.boolean().default(false),
    allowNegativeStock: z.boolean().default(false),
    scannerRequireLocation: z.boolean().default(true),
    scannerRequireUnit: z.boolean().default(true),
    inventoryModuleEnabled: z.boolean().default(true),
    transportModuleEnabled: z.boolean().default(false),
  });

  const data = schema.parse({
    name: value(formData, "name"),
    taxId: value(formData, "taxId"),
    sector: optionalValue(formData, "sector"),
    address: optionalValue(formData, "address"),
    city: optionalValue(formData, "city"),
    country: value(formData, "country") || "Colombia",
    currency: value(formData, "currency") || "COP",
    logoUrl: value(formData, "logoUrl"),
    uiTheme: value(formData, "uiTheme") || "light",
    uiDensity: value(formData, "uiDensity") || "comfortable",
    accentColor: value(formData, "accentColor") || "emerald",
    quantityDecimals: value(formData, "quantityDecimals") || "2",
    costDecimals: value(formData, "costDecimals") || "2",
    costingMethod: value(formData, "costingMethod") || "AVERAGE",
    skuRequired: formData.get("skuRequired") === "on",
    barcodeRequired: formData.get("barcodeRequired") === "on",
    allowNegativeStock: formData.get("allowNegativeStock") === "on",
    scannerRequireLocation: formData.get("scannerRequireLocation") === "on",
    scannerRequireUnit: formData.get("scannerRequireUnit") === "on",
    inventoryModuleEnabled: formData.get("inventoryModuleEnabled") === "on",
    transportModuleEnabled: formData.get("transportModuleEnabled") === "on",
  });

  const company = await prisma.company.update({
    where: { id: user.companyId },
    data: {
      ...data,
      logoUrl: data.logoUrl || null,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "company.settings.update",
    entity: "Company",
    entityId: company.id,
    newValue: company,
  });

  revalidatePath("/settings");
  redirect("/settings?updated=1");
}
