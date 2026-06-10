import Link from "next/link";
import { Ruler } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Field, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createUnit } from "@/modules/inventory/application/master-actions";

export default async function UnitsPage() {
  const user = await requireUser();
  const units = await prisma.unitOfMeasure.findMany({
    where: { companyId: user.companyId },
    include: { _count: { select: { baseProducts: true } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades de medida"
        description="Define unidades base, de compra y venta para controlar conversiones en entradas, salidas e inventarios fisicos."
        actions={
          <Button asChild variant="secondary">
            <Link href="/units/conversions">Factores de conversion</Link>
          </Button>
        }
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nueva unidad</h2>
        <form action={createUnit} className="mt-4 grid gap-4 md:grid-cols-4">
          <Field label="Nombre">
            <TextInput name="name" required placeholder="Kilogramo" />
          </Field>
          <Field label="Abreviatura">
            <TextInput name="abbreviation" required placeholder="KG" />
          </Field>
          <Field label="Tipo">
            <TextInput name="type" required placeholder="Peso" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Guardar unidad
            </Button>
          </div>
        </form>
      </section>

      {units.length === 0 ? (
        <EmptyState icon={Ruler} title="Sin unidades" description="Crea unidades para habilitar el registro de productos." />
      ) : (
        <DataTable columns={["Nombre", "Abreviatura", "Tipo", "Productos base", "Estado"]}>
          {units.map((unit) => (
            <tr key={unit.id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{unit.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{unit.abbreviation}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{unit.type}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{unit._count.baseProducts}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={unit.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
