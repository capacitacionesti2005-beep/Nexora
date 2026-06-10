import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { csvResponse, toCsv } from "@/lib/utils/csv";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const searchParams = new URL(request.url).searchParams;
  const productId = searchParams.get("productId") || undefined;
  const warehouseId = searchParams.get("warehouseId") || undefined;

  const [company, movements] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.inventoryMovement.findMany({
      where: {
        companyId: user.companyId,
        productId,
        OR: warehouseId ? [{ warehouseFromId: warehouseId }, { warehouseToId: warehouseId }] : undefined,
      },
      include: { product: true, unit: true, warehouseFrom: true, warehouseTo: true, locationFrom: true, locationTo: true, responsibleUser: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const format = createInventoryFormatter(company);

  const csv = toCsv(
    ["Fecha", "Tipo", "Motivo", "Producto", "Origen", "Destino", "Cantidad", "Unidad", "CostoUnitario", "CostoTotal", "Documento", "Responsable"],
    movements.map((movement) => [
      movement.movementDate.toISOString(),
      movement.movementType,
      movement.movementReason,
      movement.product.name,
      `${movement.warehouseFrom?.code ?? ""}/${movement.locationFrom?.locationCode ?? ""}`,
      `${movement.warehouseTo?.code ?? ""}/${movement.locationTo?.locationCode ?? ""}`,
      format.quantity(movement.quantity),
      movement.unit.abbreviation,
      format.cost(movement.unitCost),
      format.cost(movement.totalCost),
      movement.documentNumber ?? "",
      `${movement.responsibleUser.firstName} ${movement.responsibleUser.lastName}`,
    ]),
  );

  return csvResponse("movimientos.csv", csv);
}
