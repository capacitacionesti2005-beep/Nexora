import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createProduct } from "@/modules/inventory/application/master-actions";

export default async function NewProductPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const [categories, units] = await Promise.all([
    prisma.category.findMany({
      where: { companyId: user.companyId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.unitOfMeasure.findMany({
      where: { companyId: user.companyId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo producto"
        description="Registra la informacion minima para que el producto quede listo para stock, movimientos e inventario fisico."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver
            </Link>
          </Button>
        }
      />

      <form action={createProduct} className="space-y-5">
        {params.error === "sku-required" ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">La configuracion exige SKU para crear productos.</div> : null}
        {params.error === "barcode-required" ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">La configuracion exige codigo de barras para crear productos.</div> : null}
        {params.error === "image-type" ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">La foto debe ser PNG, JPG, JPEG o WEBP.</div> : null}
        {params.error === "image-size" ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">La foto no puede superar 5 MB.</div> : null}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Identificacion</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <Field label="Codigo interno">
              <TextInput name="internalCode" required placeholder="PROD-001" />
            </Field>
            <Field label="Nombre">
              <TextInput name="name" required placeholder="Nombre del producto" />
            </Field>
            <Field label="Codigo de barras">
              <TextInput name="barcode" placeholder="770..." />
            </Field>
            <Field label="SKU">
              <TextInput name="sku" placeholder="SKU comercial" />
            </Field>
            <Field label="Categoria">
              <SelectInput name="categoryId" defaultValue="">
                <option value="">Sin categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Marca">
              <TextInput name="brand" placeholder="Marca" />
            </Field>
            <Field label="Modelo">
              <TextInput name="model" placeholder="Modelo / referencia" />
            </Field>
            <Field label="Estado">
              <SelectInput name="status" defaultValue="ACTIVE">
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </SelectInput>
            </Field>
            <div className="lg:col-span-2">
              <Field label="Foto">
                <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
              </Field>
            </div>
            <div className="lg:col-span-4">
              <Field label="Descripcion">
                <TextArea name="description" placeholder="Caracteristicas, uso o notas internas." />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Unidades y costos</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <Field label="Unidad base">
              <SelectInput name="baseUnitId" required defaultValue="">
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
            <Field label="Unidad compra">
              <SelectInput name="purchaseUnitId" defaultValue="">
                <option value="">Igual a base</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.abbreviation})
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Unidad venta">
              <SelectInput name="saleUnitId" defaultValue="">
                <option value="">Igual a base</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.abbreviation})
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Factor conversion">
              <TextInput name="conversionFactor" type="number" min="0.000001" step="0.000001" defaultValue="1" />
            </Field>
            <Field label="Costo unitario">
              <TextInput name="unitCost" type="number" min="0" step="0.01" defaultValue="0" />
            </Field>
            <Field label="Costo promedio">
              <TextInput name="averageCost" type="number" min="0" step="0.01" defaultValue="0" />
            </Field>
            <Field label="Stock minimo">
              <TextInput name="minStock" type="number" min="0" step="0.000001" defaultValue="0" />
            </Field>
            <Field label="Stock maximo">
              <TextInput name="maxStock" type="number" min="0" step="0.000001" defaultValue="0" />
            </Field>
            <Field label="Punto de reorden">
              <TextInput name="reorderPoint" type="number" min="0" step="0.000001" defaultValue="0" />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Reglas operativas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["isPerishable", "Producto perecedero"],
              ["managesLot", "Maneja lote"],
              ["managesSerial", "Maneja serial"],
              ["managesExpirationDate", "Maneja vencimiento"],
            ].map(([name, label]) => (
              <label key={name} className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                <input name={name} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700" />
                {label}
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" asChild>
            <Link href="/products">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={units.length === 0}>
            Guardar producto
          </Button>
        </div>
      </form>
    </div>
  );
}
