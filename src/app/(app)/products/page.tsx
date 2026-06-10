/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";

export default async function ProductsPage() {
  const user = await requireUser();
  const [company, products] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.product.findMany({
      where: { companyId: user.companyId },
      include: {
        category: true,
        baseUnit: true,
        _count: { select: { stocks: true, movements: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
  ]);
  const format = createInventoryFormatter(company);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        description="Maestro central de referencias, codigos, costos, unidades y reglas operativas de inventario."
        actions={
          <Button asChild>
            <Link href="/products/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo producto
            </Link>
          </Button>
        }
      />

      {products.length === 0 ? (
        <EmptyState icon={Package} title="Sin productos" description="Crea productos para iniciar entradas, salidas, stock e inventarios fisicos." />
      ) : (
        <DataTable columns={["Producto", "Codigo", "Categoria", "Unidad", "Costo prom.", "Min", "Max", "Mov.", "Estado"]}>
          {products.map((product) => (
            <tr key={product.id}>
              <td className="min-w-72 px-4 py-3 text-slate-700">
                <Link href={`/products/${product.id}`} className="flex items-center gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-11 w-11 rounded-md border border-slate-200 object-cover" />
                  ) : (
                    <span className="grid h-11 w-11 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                      <Package className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-950">{product.name}</span>
                    <span className="block truncate text-xs text-slate-500">{product.sku ?? product.barcode ?? "Sin SKU/codigo de barras"}</span>
                  </span>
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                <Link href={`/products/${product.id}`} className="text-emerald-700 hover:underline">{product.internalCode}</Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{product.category?.name ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{product.baseUnit.abbreviation}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(product.averageCost)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(product.minStock)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(product.maxStock)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{product._count.movements}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={product.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
