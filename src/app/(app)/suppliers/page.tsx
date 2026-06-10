import { Truck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createSupplier } from "@/modules/procurement/application/procurement-actions";

export default async function SuppliersPage({ searchParams }: { searchParams?: Promise<{ created?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const suppliers = await prisma.supplier.findMany({
    where: { companyId: user.companyId },
    include: { _count: { select: { products: true } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Proveedores" description="Base para recomendar pedidos, agrupar compras y definir tiempos de entrega por proveedor." />
      {params.created ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Proveedor creado correctamente.</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nuevo proveedor</h2>
        <form action={createSupplier} className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Codigo">
            <TextInput name="code" required placeholder="PROV-001" />
          </Field>
          <Field label="Nombre">
            <TextInput name="name" required placeholder="Nombre proveedor" />
          </Field>
          <Field label="NIT / Identificacion">
            <TextInput name="taxId" />
          </Field>
          <Field label="Contacto">
            <TextInput name="contactName" />
          </Field>
          <Field label="Correo">
            <TextInput name="email" type="email" />
          </Field>
          <Field label="Telefono">
            <TextInput name="phone" />
          </Field>
          <Field label="Ciudad">
            <TextInput name="city" />
          </Field>
          <Field label="Lead time dias">
            <TextInput name="leadTimeDays" type="number" min="0" step="1" defaultValue="0" />
          </Field>
          <Field label="Estado">
            <SelectInput name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </SelectInput>
          </Field>
          <div className="lg:col-span-3">
            <Field label="Notas">
              <TextArea name="notes" />
            </Field>
          </div>
          <div className="flex items-end lg:col-span-4">
            <Button type="submit">Guardar proveedor</Button>
          </div>
        </form>
      </section>

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="Sin proveedores" description="Crea proveedores para que el sistema pueda agrupar recomendaciones de compra." />
      ) : (
        <DataTable columns={["Codigo", "Nombre", "Contacto", "Correo", "Lead time", "Productos", "Estado"]}>
          {suppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{supplier.code}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{supplier.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{supplier.contactName ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{supplier.email ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{supplier.leadTimeDays} dias</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{supplier._count.products}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={supplier.status} /></td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
