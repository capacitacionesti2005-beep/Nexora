import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";
import { createOutput } from "@/modules/movements/application/movement-actions";

export default async function OutputsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const [company, products, warehouses, locations, units, stocks, movements] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.product.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { code: "asc" } }),
    prisma.location.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, include: { warehouse: true }, orderBy: { locationCode: "asc" } }),
    prisma.unitOfMeasure.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.stock.findMany({
      where: { companyId: user.companyId, availableQuantity: { gt: 0 } },
      include: { product: true, warehouse: true, location: true },
      orderBy: [{ product: { name: "asc" } }, { warehouse: { code: "asc" } }],
      take: 12,
    }),
    prisma.inventoryMovement.findMany({
      where: { companyId: user.companyId, movementType: "OUT" },
      include: { product: true, warehouseFrom: true, locationFrom: true, unit: true, responsibleUser: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const format = createInventoryFormatter(company);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salidas"
        description="Registra consumo, venta, merma o ajustes negativos. El sistema no permite salida si no hay stock disponible."
      />

      {params.created ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Salida registrada correctamente.</div> : null}
      {params.error === "insufficient-stock" ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          No hay stock disponible suficiente para la combinacion seleccionada.
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nueva salida</h2>
        <form action={createOutput} className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Producto">
            <SelectInput name="productId" required defaultValue="">
              <option value="" disabled>
                Seleccionar
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.internalCode} - {product.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bodega origen">
            <SelectInput name="warehouseId" required defaultValue="">
              <option value="" disabled>
                Seleccionar
              </option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Ubicacion origen">
            <SelectInput name="locationId" defaultValue="">
              <option value="">Sin ubicacion</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} ({location.warehouse.code})
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Unidad">
            <SelectInput name="unitId" required defaultValue="">
              <option value="" disabled>
                Seleccionar
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.abbreviation})
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Cantidad">
            <TextInput name="quantity" type="number" min="0.000001" step="0.000001" required />
          </Field>
          <Field label="Tipo / motivo">
            <SelectInput name="movementReason" defaultValue="Consumo interno">
              <option>Consumo interno</option>
              <option>Venta</option>
              <option>Ajuste negativo</option>
              <option>Traslado enviado</option>
              <option>Merma</option>
              <option>Dano</option>
              <option>Perdida</option>
              <option>Prestamo</option>
              <option>Otro</option>
            </SelectInput>
          </Field>
          <Field label="Documento soporte">
            <TextInput name="documentNumber" placeholder="REQ-001" />
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
          <div className="flex items-end lg:col-span-2">
            <Button type="submit" className="w-full" disabled={products.length === 0 || warehouses.length === 0 || units.length === 0}>
              Registrar salida
            </Button>
          </div>
          <div className="lg:col-span-4">
            <Field label="Observaciones">
              <TextArea name="notes" placeholder="Area solicitante, responsable o detalle de soporte." />
            </Field>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Saldos disponibles recientes</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stocks.length === 0 ? (
            <p className="text-sm text-slate-500">No hay stock disponible para salida.</p>
          ) : (
            stocks.map((stock) => (
              <div key={stock.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-950">{stock.product.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {stock.warehouse.code} / {stock.location?.locationCode ?? "Sin ubicacion"}
                </div>
                <div className="mt-2 text-sm text-slate-700">Disponible: {format.quantity(stock.availableQuantity)}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <DataTable columns={["Fecha", "Producto", "Origen", "Cantidad", "Costo", "Total", "Documento", "Responsable"]}>
        {movements.map((movement) => (
          <tr key={movement.id}>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.createdAt.toLocaleDateString("es-CO")}</td>
            <td className="min-w-64 px-4 py-3 font-medium text-slate-950">{movement.product.name}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
              {movement.warehouseFrom?.code ?? "-"} / {movement.locationFrom?.locationCode ?? "-"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
              {format.quantity(movement.quantity)} {movement.unit.abbreviation}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(movement.unitCost)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(movement.totalCost)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.documentNumber ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.responsibleUser.firstName}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
