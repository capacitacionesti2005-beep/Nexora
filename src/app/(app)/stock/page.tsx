import Link from "next/link";
import { Boxes } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";

export default async function StockPage() {
  const user = await requireUser();
  const [company, stocks] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.stock.findMany({
      where: { companyId: user.companyId },
      include: {
        product: { include: { category: true, baseUnit: true } },
        warehouse: true,
        location: true,
      },
      orderBy: [{ product: { name: "asc" } }, { warehouse: { code: "asc" } }],
    }),
  ]);
  const format = createInventoryFormatter(company);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock actual"
        description="Saldos calculados desde movimientos. No se editan manualmente; entradas, salidas, transferencias y ajustes actualizan estas cantidades."
        actions={
          <Button asChild variant="secondary">
            <Link href="/stock/kardex">Ver kardex</Link>
          </Button>
        }
      />

      {stocks.length === 0 ? (
        <EmptyState icon={Boxes} title="Sin stock" description="Registra una entrada para crear el primer saldo de inventario." />
      ) : (
        <DataTable columns={["Producto", "Categoria", "Bodega", "Ubicacion", "Lote", "Serial", "Cantidad", "Disponible", "Costo prom.", "Costo total"]}>
          {stocks.map((stock) => (
            <tr key={stock.id}>
              <td className="min-w-64 px-4 py-3">
                <div className="font-medium text-slate-950">{stock.product.name}</div>
                <div className="text-xs text-slate-500">
                  {stock.product.internalCode} - {stock.product.baseUnit.abbreviation}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.product.category?.name ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.warehouse.code}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.location?.locationCode ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.lotNumber ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.serialNumber ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{format.quantity(stock.quantity)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(stock.availableQuantity)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(stock.averageCost)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(stock.totalCost)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
