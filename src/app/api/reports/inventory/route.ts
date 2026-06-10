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

  const [company, stocks] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.stock.findMany({
      where: { companyId: user.companyId, productId, warehouseId },
      include: { product: { include: { category: true, baseUnit: true } }, warehouse: true, location: true },
      orderBy: [{ product: { name: "asc" } }, { warehouse: { code: "asc" } }],
    }),
  ]);
  const format = createInventoryFormatter(company);

  const csv = toCsv(
    ["Producto", "Codigo", "Categoria", "Unidad", "Bodega", "Ubicacion", "Lote", "Serial", "Cantidad", "Disponible", "CostoPromedio", "CostoTotal"],
    stocks.map((stock) => [
      stock.product.name,
      stock.product.internalCode,
      stock.product.category?.name ?? "",
      stock.product.baseUnit.abbreviation,
      stock.warehouse.code,
      stock.location?.locationCode ?? "",
      stock.lotNumber ?? "",
      stock.serialNumber ?? "",
      format.quantity(stock.quantity),
      format.quantity(stock.availableQuantity),
      format.cost(stock.averageCost),
      format.cost(stock.totalCost),
    ]),
  );

  return csvResponse("inventario-general.csv", csv);
}
