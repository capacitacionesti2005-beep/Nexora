import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";

function toNumber(input: unknown) {
  if (input && typeof input === "object" && "toNumber" in input && typeof input.toNumber === "function") {
    return input.toNumber();
  }

  return Number(input ?? 0);
}

function roundToMultiple(quantity: number, multiple: number) {
  if (quantity <= 0) return 0;
  if (multiple <= 0) return quantity;
  return Math.ceil(quantity / multiple) * multiple;
}

export default async function ReplenishmentPage() {
  const user = await requireUser();
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [company, products, warehouses, movements] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.product.findMany({
      where: { companyId: user.companyId, status: "ACTIVE" },
      include: {
        baseUnit: true,
        stocks: true,
        warehouseSettings: { where: { status: "ACTIVE" } },
        suppliers: {
          where: { status: "ACTIVE" },
          include: { supplier: true, purchaseUnit: true },
          orderBy: [{ isPrimary: "desc" }, { supplier: { name: "asc" } }],
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { code: "asc" } }),
    prisma.inventoryMovement.findMany({
      where: { companyId: user.companyId, movementType: "OUT", movementDate: { gte: since } },
      select: { productId: true, quantity: true },
    }),
  ]);
  const format = createInventoryFormatter(company);

  const consumptionByProduct = movements.reduce((map, movement) => {
    map.set(movement.productId, (map.get(movement.productId) ?? 0) + toNumber(movement.quantity));
    return map;
  }, new Map<string, number>());

  const rows = products.flatMap((product) => {
    const primarySupplier = product.suppliers[0];
    const dailyConsumption = (consumptionByProduct.get(product.id) ?? 0) / 90;

    return warehouses.flatMap((warehouse) => {
      const currentStock = product.stocks
        .filter((stock) => stock.warehouseId === warehouse.id)
        .reduce((total, stock) => total + toNumber(stock.availableQuantity), 0);
      const setting = product.warehouseSettings.find((item) => item.warehouseId === warehouse.id);
      const minStock = toNumber(setting?.minStock ?? product.minStock);
      const maxStock = toNumber(setting?.maxStock ?? product.maxStock);
      const reorderPoint = toNumber(setting?.reorderPoint ?? product.reorderPoint ?? minStock);
      const leadTimeDays = primarySupplier?.leadTimeDays ?? primarySupplier?.supplier.leadTimeDays ?? 0;
      const leadTimeDemand = dailyConsumption * leadTimeDays;
      const targetStock = Math.max(maxStock, reorderPoint + leadTimeDemand);
      const rawSuggested = targetStock > 0 && currentStock <= Math.max(reorderPoint, minStock) ? targetStock - currentStock : 0;
      const purchaseMultiple = toNumber(primarySupplier?.purchaseMultiple ?? 1);
      const minPurchase = toNumber(primarySupplier?.minPurchaseQuantity ?? 0);
      const suggestedQuantity = roundToMultiple(Math.max(rawSuggested, minPurchase), purchaseMultiple);
      const unitCost = toNumber(primarySupplier?.lastPurchaseCost ?? product.averageCost);

      if (suggestedQuantity <= 0) return [];

      return [{
        product,
        warehouse,
        supplier: primarySupplier?.supplier,
        purchaseUnit: primarySupplier?.purchaseUnit?.abbreviation ?? product.baseUnit.abbreviation,
        currentStock,
        minStock,
        maxStock,
        reorderPoint,
        dailyConsumption,
        suggestedQuantity,
        estimatedCost: suggestedQuantity * unitCost,
      }];
    });
  });

  const groupedRows = rows.reduce((map, row) => {
    const key = row.supplier?.id ?? "without-supplier";
    const group = map.get(key) ?? {
      supplierName: row.supplier?.name ?? "Sin proveedor asignado",
      supplierCode: row.supplier?.code ?? "-",
      totalCost: 0,
      rows: [] as typeof rows,
    };
    group.totalCost += row.estimatedCost;
    group.rows.push(row);
    map.set(key, group);
    return map;
  }, new Map<string, { supplierName: string; supplierCode: string; totalCost: number; rows: typeof rows }>());

  const groups = Array.from(groupedRows.values()).sort((a, b) => a.supplierName.localeCompare(b.supplierName));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedido sugerido"
        description="Recomendacion basada en stock disponible, minimos/maximos por bodega, consumo reciente y proveedor principal."
        actions={
          <Button asChild variant="secondary">
            <Link href="/suppliers">Proveedores</Link>
          </Button>
        }
      />

      {groups.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Sin pedidos sugeridos" description="No hay productos por debajo de su minimo o punto de reorden." />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.supplierCode} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">{group.supplierName}</h2>
                  <p className="text-sm text-slate-500">{group.supplierCode} / {group.rows.length} referencias sugeridas</p>
                </div>
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  Total estimado: {format.cost(group.totalCost)}
                </div>
              </div>
              <div className="mt-4">
                <DataTable columns={["Producto", "Bodega", "Stock", "Min", "Max", "Reorden", "Consumo/dia", "Sugerido", "Unidad", "Costo est."]}>
                  {group.rows.map((row) => (
                    <tr key={`${row.product.id}-${row.warehouse.id}`}>
                      <td className="min-w-64 px-4 py-3 font-medium text-slate-950">
                        <Link href={`/products/${row.product.id}`} className="text-emerald-700 hover:underline">{row.product.name}</Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.warehouse.code}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(row.currentStock)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(row.minStock)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(row.maxStock)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(row.reorderPoint)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(row.dailyConsumption)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">{format.quantity(row.suggestedQuantity)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.purchaseUnit}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(row.estimatedCost)}</td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
