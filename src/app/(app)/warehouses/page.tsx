import { Warehouse } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createWarehouse } from "@/modules/inventory/application/master-actions";

const warehouseTypes = [
  ["MAIN", "Principal"],
  ["SECONDARY", "Secundaria"],
  ["POINT_OF_SALE", "Punto de venta"],
  ["TEMPORARY", "Temporal"],
  ["QUARANTINE", "Cuarentena"],
  ["RETURNS", "Devoluciones"],
  ["PRODUCTION", "Produccion"],
  ["INTERNAL_CONSUMPTION", "Consumo interno"],
] as const;

export default async function WarehousesPage() {
  const user = await requireUser();
  const warehouses = await prisma.warehouse.findMany({
    where: { companyId: user.companyId },
    include: { responsibleUser: true, _count: { select: { locations: true, stocks: true } } },
    orderBy: [{ status: "asc" }, { code: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bodegas"
        description="Registra bodegas, puntos de venta y areas operativas donde se controla stock fisico."
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nueva bodega</h2>
        <form action={createWarehouse} className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Codigo">
            <TextInput name="code" required placeholder="BOD-01" />
          </Field>
          <Field label="Nombre">
            <TextInput name="name" required placeholder="Bodega principal" />
          </Field>
          <Field label="Tipo">
            <SelectInput name="type" defaultValue="MAIN">
              {warehouseTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Ciudad">
            <TextInput name="city" placeholder="Bogota" />
          </Field>
          <Field label="Direccion">
            <TextInput name="address" placeholder="Direccion fisica" />
          </Field>
          <div className="lg:col-span-2">
            <Field label="Observaciones">
              <TextArea name="notes" placeholder="Responsable, restricciones o uso de la bodega." />
            </Field>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Guardar bodega
            </Button>
          </div>
        </form>
      </section>

      {warehouses.length === 0 ? (
        <EmptyState icon={Warehouse} title="Sin bodegas" description="Crea una bodega para poder registrar ubicaciones y stock." />
      ) : (
        <DataTable columns={["Codigo", "Nombre", "Tipo", "Ciudad", "Ubicaciones", "Saldos", "Estado"]}>
          {warehouses.map((warehouse) => (
            <tr key={warehouse.id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{warehouse.code}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{warehouse.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{warehouse.type}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{warehouse.city ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{warehouse._count.locations}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{warehouse._count.stocks}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={warehouse.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
