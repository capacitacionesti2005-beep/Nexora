import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  FileDown,
  Package,
  PackageMinus,
  PackagePlus,
  Plus,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { MetricChartCard } from "@/components/dashboard/metric-chart-card";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";

function decimalToNumber(input: unknown) {
  if (input && typeof input === "object" && "toNumber" in input && typeof input.toNumber === "function") {
    return input.toNumber();
  }
  return Number(input ?? 0);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }).replace(".", "");
}

export default async function DashboardPage() {
  const user = await requireUser();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const chartStart = new Date();
  chartStart.setDate(chartStart.getDate() - 6);
  chartStart.setHours(0, 0, 0, 0);

  const [
    company,
    products,
    activeWarehouses,
    activeSuppliers,
    inventoryValue,
    entriesThisMonth,
    outputsThisMonth,
    openInventories,
    recentMovements,
    chartMovements,
    stocks,
  ] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.product.findMany({
      where: { companyId: user.companyId, status: "ACTIVE" },
      include: { suppliers: { where: { status: "ACTIVE" } } },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.count({ where: { companyId: user.companyId, status: "ACTIVE" } }),
    prisma.supplier.count({ where: { companyId: user.companyId, status: "ACTIVE" } }),
    prisma.stock.aggregate({ where: { companyId: user.companyId }, _sum: { totalCost: true } }),
    prisma.inventoryMovement.count({ where: { companyId: user.companyId, movementType: "IN", movementDate: { gte: monthStart } } }),
    prisma.inventoryMovement.count({ where: { companyId: user.companyId, movementType: "OUT", movementDate: { gte: monthStart } } }),
    prisma.physicalInventory.findMany({
      where: { companyId: user.companyId, status: { in: ["COUNTING", "REVIEW"] } },
      include: { warehouse: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.inventoryMovement.findMany({
      where: { companyId: user.companyId },
      include: { product: true, warehouseFrom: true, warehouseTo: true, responsibleUser: true },
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
    prisma.inventoryMovement.findMany({
      where: { companyId: user.companyId, movementDate: { gte: chartStart } },
      select: { movementDate: true, totalCost: true },
      orderBy: { movementDate: "asc" },
    }),
    prisma.stock.findMany({
      where: { companyId: user.companyId },
      include: { product: true, warehouse: true },
    }),
  ]);

  const format = createInventoryFormatter(company);
  const activeProducts = products.length;
  const productsWithoutSupplier = products.filter((product) => product.suppliers.length === 0).length;
  const lowStockRows = stocks.filter((stock) => decimalToNumber(stock.quantity) < decimalToNumber(stock.product.minStock));
  const highStockRows = stocks.filter((stock) => {
    const maxStock = decimalToNumber(stock.product.maxStock);
    return maxStock > 0 && decimalToNumber(stock.quantity) > maxStock;
  });
  const lowStock = lowStockRows.length;
  const highStock = highStockRows.length;
  const suggestedPurchaseProducts = lowStockRows.filter((stock) => stock.product.maxStock.toString() !== "0").length;
  const movementTotal = entriesThisMonth + outputsThisMonth;
  const movedValue = chartMovements.reduce((total, movement) => total + decimalToNumber(movement.totalCost), 0);

  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(chartStart);
    day.setDate(chartStart.getDate() + index);
    return day;
  });

  const movementsByDay = new Map(days.map((day) => [dateKey(day), { label: dayLabel(day), value: 0 }]));
  const valueByDay = new Map(days.map((day) => [dateKey(day), { label: dayLabel(day), value: 0 }]));

  for (const movement of chartMovements) {
    const key = dateKey(movement.movementDate);
    const movementPoint = movementsByDay.get(key);
    const valuePoint = valueByDay.get(key);

    if (movementPoint) movementPoint.value += 1;
    if (valuePoint) valuePoint.value += decimalToNumber(movement.totalCost);
  }

  const movementChartData = days.map((day) => movementsByDay.get(dateKey(day)) ?? { label: dayLabel(day), value: 0 });
  const valueChartData = days.map((day) => valueByDay.get(dateKey(day)) ?? { label: dayLabel(day), value: 0 });

  const firstName = user.name?.split(" ")[0] || "equipo";
  const quickActions = [
    { label: "Nueva entrada", href: "/movements/entries", icon: PackagePlus },
    { label: "Nueva salida", href: "/movements/outputs", icon: PackageMinus },
    { label: "Crear producto", href: "/products/new", icon: Package },
    { label: "Conteo fisico", href: "/physical-inventory", icon: ClipboardCheck },
    { label: "Reportes", href: "/reports", icon: FileDown },
  ];

  const metricCards = [
    { label: "Inventario total", value: format.cost(inventoryValue._sum.totalCost), helper: "Saldos valorizados", href: "/stock", icon: Boxes },
    { label: "Productos", value: activeProducts.toString(), helper: `${productsWithoutSupplier} sin proveedor`, href: "/products", icon: Package },
    { label: "Bajo minimo", value: lowStock.toString(), helper: "Prioridad de compra", href: "/replenishment", icon: AlertTriangle },
    { label: "Pedido sugerido", value: suggestedPurchaseProducts.toString(), helper: "Referencias candidatas", href: "/replenishment", icon: ShoppingCart },
  ];

  const alertItems = [
    lowStock > 0 ? { label: `${lowStock} saldos bajo minimo`, href: "/replenishment", tone: "red" } : null,
    highStock > 0 ? { label: `${highStock} saldos sobre maximo`, href: "/stock", tone: "amber" } : null,
    productsWithoutSupplier > 0 ? { label: `${productsWithoutSupplier} productos sin proveedor`, href: "/products", tone: "amber" } : null,
    openInventories.length > 0 ? { label: `${openInventories.length} jornadas fisicas abiertas`, href: "/physical-inventory", tone: "blue" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; tone: "red" | "amber" | "blue" }>;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Nexora</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950">¡Hola {firstName}!</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Panel operativo de inventario, movimientos, alertas y abastecimiento inteligente.
          </p>
        </div>
        <Button asChild>
          <Link href="/movements/entries">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva entrada
          </Link>
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex min-h-24 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 transition group-hover:bg-cyan-600 group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-3 text-sm font-black text-slate-800">{action.label}</span>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-700">{card.label}</p>
                  <p className="mt-3 text-3xl font-black tracking-normal text-slate-950">{card.value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{card.helper}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MetricChartCard
          title="Movimientos"
          value={movementTotal.toLocaleString("es-CO")}
          href="/reports?reportType=movements"
          actionLabel="Ver reporte"
          data={movementChartData}
        />
        <MetricChartCard
          title="Valor movido"
          value={format.cost(movedValue)}
          href="/stock/kardex"
          actionLabel="Ver kardex"
          data={valueChartData}
          valuePrefix="$ "
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Actividad reciente</h2>
              <p className="text-sm text-slate-500">Ultimos movimientos registrados.</p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/stock/kardex">Ver kardex</Link>
            </Button>
          </div>
          <div className="mt-4">
            <DataTable columns={["Fecha", "Tipo", "Producto", "Bodega", "Cantidad", "Responsable"]}>
              {recentMovements.map((movement) => (
                <tr key={movement.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.movementDate.toLocaleDateString("es-CO")}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">{movement.movementType}</td>
                  <td className="min-w-64 px-4 py-3 text-slate-600">{movement.product.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.warehouseTo?.code ?? movement.warehouseFrom?.code ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(movement.quantity)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.responsibleUser.firstName}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <h2 className="text-base font-black text-slate-950">Alertas accionables</h2>
            <div className="mt-4 space-y-2">
              {alertItems.length === 0 ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">Operacion sin alertas criticas.</p> : null}
              {alertItems.map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white">
                  <span>{item.label}</span>
                  <span className={item.tone === "red" ? "text-rose-700" : item.tone === "amber" ? "text-amber-700" : "text-sky-700"}>Abrir</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">Operacion</h2>
              <Warehouse className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link href="/warehouses" className="rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-white">
                <p className="text-2xl font-black text-slate-950">{activeWarehouses}</p>
                <p className="text-xs font-bold text-slate-500">Bodegas</p>
              </Link>
              <Link href="/suppliers" className="rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-white">
                <p className="text-2xl font-black text-slate-950">{activeSuppliers}</p>
                <p className="text-xs font-bold text-slate-500">Proveedores</p>
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {openInventories.length === 0 ? <p className="text-sm text-slate-500">No hay inventarios fisicos abiertos.</p> : null}
              {openInventories.map((inventory) => (
                <Link key={inventory.id} href={`/physical-inventory?inventoryId=${inventory.id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-white">
                  <p className="text-sm font-bold text-slate-950">{inventory.code} - {inventory.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{inventory.status} / {inventory.warehouse?.code ?? "Todas"} / {inventory._count.items} items</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
