import Link from "next/link";
import { Field, SelectInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";

type ReportType = "inventory" | "movements" | "kardex";

function exportHref(reportType: ReportType, productId?: string, warehouseId?: string) {
  const searchParams = new URLSearchParams();
  if (productId) searchParams.set("productId", productId);
  if (warehouseId) searchParams.set("warehouseId", warehouseId);
  return `/api/reports/${reportType}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ reportType?: ReportType; productId?: string; warehouseId?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const reportType = params.reportType ?? "inventory";
  const user = await requireUser();
  const [company, products, warehouses] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.product.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { companyId: user.companyId }, orderBy: { code: "asc" } }),
  ]);
  const format = createInventoryFormatter(company);

  const productId = params.productId || undefined;
  const warehouseId = params.warehouseId || undefined;

  const inventoryRows =
    reportType === "inventory"
      ? await prisma.stock.findMany({
          where: { companyId: user.companyId, productId, warehouseId },
          include: { product: { include: { baseUnit: true, category: true } }, warehouse: true, location: true },
          orderBy: [{ product: { name: "asc" } }, { warehouse: { code: "asc" } }],
          take: 100,
        })
      : [];

  const movementRows =
    reportType !== "inventory"
      ? await prisma.inventoryMovement.findMany({
          where: {
            companyId: user.companyId,
            productId,
            OR: warehouseId ? [{ warehouseFromId: warehouseId }, { warehouseToId: warehouseId }] : undefined,
          },
          include: { product: true, unit: true, warehouseFrom: true, warehouseTo: true, locationFrom: true, locationTo: true },
          orderBy: reportType === "kardex" ? { movementDate: "asc" } : { createdAt: "desc" },
          take: 100,
        })
      : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" description="Filtra, revisa en pantalla y exporta el resultado exacto en CSV." />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-[220px_1fr_1fr_auto_auto]">
          <Field label="Reporte">
            <SelectInput name="reportType" defaultValue={reportType}>
              <option value="inventory">Inventario</option>
              <option value="movements">Movimientos</option>
              <option value="kardex">Kardex</option>
            </SelectInput>
          </Field>
          <Field label="Producto">
            <SelectInput name="productId" defaultValue={productId ?? ""}>
              <option value="">Todos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.internalCode} - {product.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bodega">
            <SelectInput name="warehouseId" defaultValue={warehouseId ?? ""}>
              <option value="">Todas</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Ver reporte
            </Button>
          </div>
          <div className="flex items-end">
            <Button asChild variant="secondary">
              <Link href={exportHref(reportType, productId, warehouseId)}>Exportar CSV</Link>
            </Button>
          </div>
        </form>
      </section>

      {reportType === "inventory" ? (
        <DataTable columns={["Producto", "Codigo", "Categoria", "Bodega", "Ubicacion", "Cantidad", "Disponible", "Costo total"]}>
          {inventoryRows.map((stock) => (
            <tr key={stock.id}>
              <td className="min-w-64 px-4 py-3 font-medium text-slate-950">{stock.product.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.product.internalCode}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.product.category?.name ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.warehouse.code}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.location?.locationCode ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(stock.quantity)} {stock.product.baseUnit.abbreviation}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(stock.availableQuantity)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(stock.totalCost)}</td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <DataTable columns={["Fecha", "Producto", "Tipo", "Motivo", "Origen", "Destino", "Cantidad", "Total"]}>
          {movementRows.map((movement) => (
            <tr key={movement.id}>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.movementDate.toLocaleDateString("es-CO")}</td>
              <td className="min-w-64 px-4 py-3 font-medium text-slate-950">{movement.product.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.movementType}</td>
              <td className="min-w-64 px-4 py-3 text-slate-600">{movement.movementReason}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.warehouseFrom?.code ?? "-"} / {movement.locationFrom?.locationCode ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.warehouseTo?.code ?? "-"} / {movement.locationTo?.locationCode ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(movement.quantity)} {movement.unit.abbreviation}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(movement.totalCost)}</td>
            </tr>
          ))}
        </DataTable>
      )}

      <p className="text-xs text-slate-500">Vista previa limitada a 100 registros. La exportacion usa los mismos filtros seleccionados.</p>
    </div>
  );
}
