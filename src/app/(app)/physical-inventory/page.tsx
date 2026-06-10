import Link from "next/link";
import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";
import { approvePhysicalInventory, countPhysicalInventoryItem, createPhysicalInventory, importPhysicalInventoryCounts } from "@/modules/physical-inventory/application/physical-inventory-actions";

export default async function PhysicalInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ inventoryId?: string; created?: string; approved?: string; countsImported?: string; error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const [company, warehouses, categories, inventories] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.warehouse.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { code: "asc" } }),
    prisma.category.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.physicalInventory.findMany({
      where: { companyId: user.companyId },
      include: { warehouse: true, category: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const format = createInventoryFormatter(company);

  const selectedInventoryId = params.inventoryId || inventories[0]?.id;
  const selectedInventory = selectedInventoryId
    ? await prisma.physicalInventory.findFirst({
        where: { id: selectedInventoryId, companyId: user.companyId },
        include: {
          items: {
            include: { product: true, warehouse: true, location: true, unit: true },
            orderBy: [{ product: { name: "asc" } }],
          },
        },
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario fisico" description="La jornada es el corte mensual o por bodega: toma una foto del stock esperado, permite cargar/registrar conteos reales y luego aprobar diferencias." />
      {params.created ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Jornada creada.</div> : null}
      {params.approved ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Diferencias aprobadas y ajustadas.</div> : null}
      {params.countsImported ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Conteos importados: {params.countsImported}.</div> : null}
      {params.error === "file-required" ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">Selecciona un archivo CSV de conteos.</div> : null}
      {params.error === "pending-counts" ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">No puedes aprobar: todavia hay items pendientes de conteo.</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nueva jornada</h2>
        <form action={createPhysicalInventory} className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Codigo">
            <TextInput name="code" required placeholder="INV-2026-001" />
          </Field>
          <Field label="Nombre">
            <TextInput name="name" required placeholder="Conteo general junio" />
          </Field>
          <Field label="Bodega">
            <SelectInput name="warehouseId" defaultValue="">
              <option value="">Todas</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Categoria">
            <SelectInput name="categoryId" defaultValue="">
              <option value="">Todas</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </SelectInput>
          </Field>
          <label className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
            <input name="isBlindCount" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700" />
            Conteo ciego
          </label>
          <div className="lg:col-span-2">
            <Field label="Observaciones">
              <TextArea name="notes" />
            </Field>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Crear jornada</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">Si son varias bodegas puedes crear una jornada por cada bodega para cargarlas por separado, o elegir Todas para una jornada general.</p>
      </section>

      <DataTable columns={["Codigo", "Nombre", "Alcance", "Estado", "Items"]}>
        {inventories.map((inventory) => (
          <tr key={inventory.id}>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
              <a href={`/physical-inventory?inventoryId=${inventory.id}`} className="text-emerald-700 hover:underline">{inventory.code}</a>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inventory.name}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inventory.warehouse?.code ?? "Todas"} / {inventory.category?.name ?? "Todas"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inventory.status}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{inventory._count.items}</td>
          </tr>
        ))}
      </DataTable>

      {selectedInventory ? (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-slate-950">{selectedInventory.code} - {selectedInventory.name}</h2>
              <p className="text-sm text-slate-500">
                Items: {selectedInventory.items.length} / Contados: {selectedInventory.items.filter((item) => item.countedQuantity !== null).length} / Pendientes: {selectedInventory.items.filter((item) => item.countedQuantity === null).length} / Con diferencia: {selectedInventory.items.filter((item) => Number(item.difference.toString()) !== 0).length}
              </p>
            </div>
            <form action={approvePhysicalInventory}>
              <input type="hidden" name="inventoryId" value={selectedInventory.id} />
              <Button type="submit" disabled={selectedInventory.status === "ADJUSTED" || selectedInventory.items.length === 0 || selectedInventory.items.some((item) => item.countedQuantity === null)}>Aprobar diferencias</Button>
            </form>
          </div>

          <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Conteo guiado por QR</h3>
            <p className="mt-1 text-sm text-slate-500">Abre una ubicacion de la jornada, valida el QR fisico y registra conteos con evidencia.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(
                new Map(
                  selectedInventory.items
                    .filter((item) => item.location)
                    .map((item) => [item.location!.id, item.location!]),
                ).values(),
              ).map((location) => (
                <Button key={location.id} asChild variant="secondary">
                  <Link href={`/locations/${location.id}/scan`}>{location.locationCode}</Link>
                </Button>
              ))}
              {selectedInventory.items.every((item) => !item.location) ? <p className="text-sm text-slate-500">Esta jornada no tiene ubicaciones asociadas.</p> : null}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Cargar resultados del inventario mensual</h3>
            <p className="mt-1 text-sm text-slate-500">Descarga el formato, diligencia `itemId` y `countedQuantity`, y vuelve a cargarlo en esta misma jornada.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <a href="/api/imports/template?type=physicalCounts" className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Descargar formato de conteo
              </a>
              <form action={importPhysicalInventoryCounts} className="flex flex-1 flex-col gap-3 sm:flex-row">
                <input type="hidden" name="inventoryId" value={selectedInventory.id} />
                <input name="file" type="file" accept=".csv,text/csv" required className="block h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                <Button type="submit" variant="secondary">Cargar conteos</Button>
              </form>
            </div>
          </section>

          <DataTable columns={["Producto", "Bodega", "Ubicacion", "Sistema", "Contado", "Diferencia", "Origen", "Evidencia", "Registrar conteo"]}>
            {selectedInventory.items.map((item) => (
              <tr key={item.id}>
                <td className="min-w-64 px-4 py-3 font-medium text-slate-950">{item.product.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.warehouse.code}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.location?.locationCode ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{selectedInventory.isBlindCount ? "Oculto" : format.quantity(item.systemQuantity)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.countedQuantity !== null ? format.quantity(item.countedQuantity) : "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(item.difference)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.countSource}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {item.evidenceImageUrl ? <a href={item.evidenceImageUrl} target="_blank" className="text-emerald-700 hover:underline">Ver</a> : "-"}
                </td>
                <td className="min-w-96 px-4 py-3">
                  <form action={countPhysicalInventoryItem} className="grid gap-2">
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="countSource" value="MANUAL" />
                    <TextInput name="countedQuantity" type="number" min="0" step="0.000001" defaultValue={item.countedQuantity?.toString() ?? ""} />
                    <TextArea name="notes" defaultValue={item.notes ?? ""} placeholder="Observacion del conteo." />
                    <input name="evidenceImage" type="file" accept="image/png,image/jpeg,image/webp" className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                    <Button type="submit" variant="secondary">Guardar</Button>
                  </form>
                </td>
              </tr>
            ))}
          </DataTable>
        </section>
      ) : null}
    </div>
  );
}
