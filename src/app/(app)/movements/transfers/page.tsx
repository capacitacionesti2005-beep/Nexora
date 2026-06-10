import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";
import { createTransfer } from "@/modules/movements/application/movement-actions";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const [company, products, warehouses, locations, units, movements] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.product.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { code: "asc" } }),
    prisma.location.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, include: { warehouse: true }, orderBy: { locationCode: "asc" } }),
    prisma.unitOfMeasure.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.inventoryMovement.findMany({
      where: { companyId: user.companyId, movementType: "TRANSFER" },
      include: { product: true, warehouseFrom: true, warehouseTo: true, locationFrom: true, locationTo: true, unit: true, responsibleUser: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const format = createInventoryFormatter(company);

  return (
    <div className="space-y-6">
      <PageHeader title="Transferencias" description="Traslada productos entre bodegas o ubicaciones. La operacion descuenta origen y suma destino en una sola transaccion." />

      {params.created ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Transferencia registrada correctamente.</div> : null}
      {params.error === "insufficient-stock" ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">No hay stock suficiente en el origen seleccionado.</div> : null}
      {params.error === "same-location" ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">El origen y destino no pueden ser iguales.</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nueva transferencia</h2>
        <form action={createTransfer} className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Producto">
            <SelectInput name="productId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.internalCode} - {product.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Bodega origen">
            <SelectInput name="warehouseFromId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Ubicacion origen">
            <SelectInput name="locationFromId" defaultValue="">
              <option value="">Sin ubicacion</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.locationCode} ({location.warehouse.code})</option>)}
            </SelectInput>
          </Field>
          <Field label="Bodega destino">
            <SelectInput name="warehouseToId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Ubicacion destino">
            <SelectInput name="locationToId" defaultValue="">
              <option value="">Sin ubicacion</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.locationCode} ({location.warehouse.code})</option>)}
            </SelectInput>
          </Field>
          <Field label="Unidad">
            <SelectInput name="unitId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</option>)}
            </SelectInput>
          </Field>
          <Field label="Cantidad">
            <TextInput name="quantity" type="number" min="0.000001" step="0.000001" required />
          </Field>
          <Field label="Documento">
            <TextInput name="documentNumber" placeholder="TR-001" />
          </Field>
          <Field label="Lote">
            <TextInput name="lotNumber" />
          </Field>
          <Field label="Serial">
            <TextInput name="serialNumber" />
          </Field>
          <Field label="Vencimiento">
            <TextInput name="expirationDate" type="date" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={products.length === 0 || warehouses.length < 1 || units.length === 0}>Registrar transferencia</Button>
          </div>
          <div className="lg:col-span-4">
            <Field label="Observaciones">
              <TextArea name="notes" />
            </Field>
          </div>
        </form>
      </section>

      <DataTable columns={["Fecha", "Producto", "Origen", "Destino", "Cantidad", "Costo", "Documento", "Responsable"]}>
        {movements.map((movement) => (
          <tr key={movement.id}>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.createdAt.toLocaleDateString("es-CO")}</td>
            <td className="min-w-64 px-4 py-3 font-medium text-slate-950">{movement.product.name}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.warehouseFrom?.code ?? "-"} / {movement.locationFrom?.locationCode ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.warehouseTo?.code ?? "-"} / {movement.locationTo?.locationCode ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(movement.quantity)} {movement.unit.abbreviation}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(movement.totalCost)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.documentNumber ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.responsibleUser.firstName}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
