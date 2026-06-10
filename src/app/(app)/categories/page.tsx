import { Layers3 } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createCategory } from "@/modules/inventory/application/master-actions";

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    where: { companyId: user.companyId },
    include: { parent: true, _count: { select: { products: true, children: true } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Administra familias, lineas y subcategorias para clasificar productos por sector, uso o area operativa."
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nueva categoria</h2>
        <form action={createCategory} className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Codigo">
            <TextInput name="code" placeholder="CAT-001" />
          </Field>
          <Field label="Nombre">
            <TextInput name="name" required placeholder="Repuestos" />
          </Field>
          <Field label="Categoria padre">
            <SelectInput name="parentId" defaultValue="">
              <option value="">Sin padre</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Estado">
            <SelectInput name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </SelectInput>
          </Field>
          <div className="lg:col-span-3">
            <Field label="Descripcion">
              <TextArea name="description" placeholder="Uso interno, linea comercial o criterio operativo." />
            </Field>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Guardar categoria
            </Button>
          </div>
        </form>
      </section>

      {categories.length === 0 ? (
        <EmptyState icon={Layers3} title="Sin categorias" description="Crea la primera categoria para poder clasificar productos." />
      ) : (
        <DataTable columns={["Codigo", "Nombre", "Padre", "Productos", "Subcategorias", "Estado"]}>
          {categories.map((category) => (
            <tr key={category.id}>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{category.code ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{category.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{category.parent?.name ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{category._count.products}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{category._count.children}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={category.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
