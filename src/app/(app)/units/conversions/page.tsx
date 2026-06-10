import { Field, SelectInput, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";
import { createUnitConversion } from "@/modules/inventory/application/master-actions";

export default async function UnitConversionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const [company, products, units, conversions] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.product.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.unitOfMeasure.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.unitConversion.findMany({
      where: { companyId: user.companyId },
      include: { product: true, fromUnit: true, toUnit: true },
      orderBy: [{ product: { name: "asc" } }, { createdAt: "desc" }],
    }),
  ]);
  const format = createInventoryFormatter(company);

  return (
    <div className="space-y-6">
      <PageHeader title="Factores de conversion" description="Configura equivalencias entre unidades para un producto especifico." />

      {params.created ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Conversion creada correctamente.</div> : null}
      {params.error === "same-unit" ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">La unidad origen y destino deben ser diferentes.</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nueva conversion</h2>
        <form action={createUnitConversion} className="mt-4 grid gap-4 lg:grid-cols-5">
          <Field label="Producto">
            <SelectInput name="productId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.internalCode} - {product.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Desde">
            <SelectInput name="fromUnitId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</option>)}
            </SelectInput>
          </Field>
          <Field label="Hacia">
            <SelectInput name="toUnitId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</option>)}
            </SelectInput>
          </Field>
          <Field label="Factor">
            <TextInput name="factor" type="number" min="0.000001" step="0.000001" required placeholder="12" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={products.length === 0 || units.length < 2}>Guardar</Button>
          </div>
        </form>
      </section>

      <DataTable columns={["Producto", "Desde", "Hacia", "Factor", "Estado"]}>
        {conversions.map((conversion) => (
          <tr key={conversion.id}>
            <td className="min-w-64 px-4 py-3 font-medium text-slate-950">{conversion.product.name}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{conversion.fromUnit.abbreviation}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{conversion.toUnit.abbreviation}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(conversion.factor)}</td>
            <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={conversion.status} /></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
