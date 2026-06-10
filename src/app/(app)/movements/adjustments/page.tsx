import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";
import { createAdjustment } from "@/modules/movements/application/movement-actions";

export default async function AdjustmentsPage({
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
      where: { companyId: user.companyId, movementType: "ADJUSTMENT" },
      include: { product: true, warehouseFrom: true, warehouseTo: true, locationFrom: true, locationTo: true, unit: true, responsibleUser: true, approvedByUser: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const format = createInventoryFormatter(company);

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" description="Registra ajustes positivos o negativos aprobados. Cada ajuste queda auditado y actualiza stock." />

      {params.created ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Ajuste registrado correctamente.</div> : null}
      {params.error === "insufficient-stock" ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">No hay stock suficiente para el ajuste negativo.</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nuevo ajuste</h2>
        <form action={createAdjustment} className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Producto">
            <SelectInput name="productId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.internalCode} - {product.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Bodega">
            <SelectInput name="warehouseId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Ubicacion">
            <SelectInput name="locationId" defaultValue="">
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
          <Field label="Tipo">
            <SelectInput name="adjustmentType" defaultValue="POSITIVE">
              <option value="POSITIVE">Positivo</option>
              <option value="NEGATIVE">Negativo</option>
            </SelectInput>
          </Field>
          <Field label="Cantidad">
            <TextInput name="quantity" type="number" min="0.000001" step="0.000001" required />
          </Field>
          <Field label="Costo unitario">
            <TextInput name="unitCost" type="number" min="0" step="0.01" defaultValue="0" />
          </Field>
          <Field label="Motivo">
            <SelectInput name="movementReason" defaultValue="Correccion de registro">
              <option>Correccion de registro</option>
              <option>Diferencia inventario fisico</option>
              <option>Dano</option>
              <option>Perdida</option>
              <option>Vencimiento</option>
              <option>Error de digitacion</option>
              <option>Otro</option>
            </SelectInput>
          </Field>
          <Field label="Documento">
            <TextInput name="documentNumber" placeholder="AJ-001" />
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
          <div className="lg:col-span-4">
            <Field label="Observaciones">
              <TextArea name="notes" />
            </Field>
          </div>
          <div className="lg:col-span-4">
            <Button type="submit" disabled={products.length === 0 || warehouses.length === 0 || units.length === 0}>Registrar ajuste aprobado</Button>
          </div>
        </form>
      </section>

      <DataTable columns={["Fecha", "Producto", "Tipo", "Bodega", "Cantidad", "Costo", "Documento", "Aprobador"]}>
        {movements.map((movement) => (
          <tr key={movement.id}>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.createdAt.toLocaleDateString("es-CO")}</td>
            <td className="min-w-64 px-4 py-3 font-medium text-slate-950">{movement.product.name}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.movementReason}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.warehouseTo?.code ?? movement.warehouseFrom?.code ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(movement.quantity)} {movement.unit.abbreviation}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(movement.totalCost)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.documentNumber ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.approvedByUser?.firstName ?? movement.responsibleUser.firstName}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
