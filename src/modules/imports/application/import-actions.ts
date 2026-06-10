"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/modules/audit/log-audit";

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const parseLine = (line: string) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];
      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function value(row: Record<string, string>, key: string) {
  return (row[key] ?? "").trim();
}

export async function importCsv(formData: FormData) {
  const user = await requireUser();
  const importType = String(formData.get("importType") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/imports?error=file-required");
  }

  const rows = parseCsv(await file.text());
  let validRows = 0;
  let invalidRows = 0;

  const batch = await prisma.importBatch.create({
    data: {
      companyId: user.companyId,
      importType,
      fileName: file.name,
      status: "VALIDATING",
      totalRows: rows.length,
      createdByUserId: user.id,
    },
  });

  for (const row of rows) {
    try {
      if (importType === "units") {
        const abbreviation = value(row, "abbreviation").toUpperCase();
        await prisma.unitOfMeasure.upsert({
          where: { companyId_abbreviation: { companyId: user.companyId, abbreviation } },
          update: { name: value(row, "name"), type: value(row, "type") || "Cantidad", status: "ACTIVE" },
          create: { companyId: user.companyId, name: value(row, "name"), abbreviation, type: value(row, "type") || "Cantidad" },
        });
      } else if (importType === "categories") {
        await prisma.category.upsert({
          where: { companyId_name: { companyId: user.companyId, name: value(row, "name") } },
          update: { code: value(row, "code") || undefined, description: value(row, "description") || undefined, status: "ACTIVE" },
          create: { companyId: user.companyId, code: value(row, "code") || undefined, name: value(row, "name"), description: value(row, "description") || undefined },
        });
      } else if (importType === "warehouses") {
        const code = value(row, "code").toUpperCase();
        await prisma.warehouse.upsert({
          where: { companyId_code: { companyId: user.companyId, code } },
          update: { name: value(row, "name"), city: value(row, "city") || undefined, status: "ACTIVE" },
          create: { companyId: user.companyId, code, name: value(row, "name"), city: value(row, "city") || undefined },
        });
      } else if (importType === "products") {
        const unit = await prisma.unitOfMeasure.findFirstOrThrow({
          where: { companyId: user.companyId, abbreviation: value(row, "baseUnitAbbreviation").toUpperCase() },
        });
        const categoryName = value(row, "category");
        const category = categoryName
          ? await prisma.category.findFirst({ where: { companyId: user.companyId, name: categoryName } })
          : null;
        await prisma.product.upsert({
          where: { companyId_internalCode: { companyId: user.companyId, internalCode: value(row, "internalCode").toUpperCase() } },
          update: { name: value(row, "name"), categoryId: category?.id, baseUnitId: unit.id, status: "ACTIVE" },
          create: {
            companyId: user.companyId,
            internalCode: value(row, "internalCode").toUpperCase(),
            name: value(row, "name"),
            sku: value(row, "sku") || undefined,
            barcode: value(row, "barcode") || undefined,
            categoryId: category?.id,
            baseUnitId: unit.id,
            qrCode: value(row, "internalCode").toUpperCase(),
          },
        });
      } else {
        throw new Error("Tipo de importacion no soportado");
      }
      validRows += 1;
    } catch {
      invalidRows += 1;
    }
  }

  const updatedBatch = await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: invalidRows > 0 ? "FAILED" : "IMPORTED",
      validRows,
      invalidRows,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "import.run",
    entity: "ImportBatch",
    entityId: updatedBatch.id,
    newValue: updatedBatch,
  });

  revalidatePath("/imports");
  redirect(`/imports?imported=1&valid=${validRows}&invalid=${invalidRows}`);
}
