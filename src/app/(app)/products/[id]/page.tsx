/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft, ImageUp } from "lucide-react";
import { Field, SelectInput, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";
import { linkProductSupplier, uploadProductImage, upsertProductWarehouseSetting } from "@/modules/procurement/application/procurement-actions";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ imageSaved?: string; supplierSaved?: string; warehouseSettingSaved?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const user = await requireUser();
  const [company, product, suppliers, units, warehouses, warehouseSettings] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.product.findFirstOrThrow({
      where: { id, companyId: user.companyId },
      include: {
        category: true,
        baseUnit: true,
        suppliers: { include: { supplier: true, purchaseUnit: true }, orderBy: [{ isPrimary: "desc" }, { supplier: { name: "asc" } }] },
        stocks: { include: { warehouse: true, location: true }, orderBy: [{ warehouse: { code: "asc" } }] },
      },
    }),
    prisma.supplier.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.unitOfMeasure.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { code: "asc" } }),
    prisma.productWarehouseSetting.findMany({
      where: { companyId: user.companyId, productId: id },
      include: { warehouse: true },
      orderBy: { warehouse: { code: "asc" } },
    }),
  ]);
  const format = createInventoryFormatter(company);

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.internalCode} / ${product.sku ?? "Sin SKU"} / ${product.barcode ?? "Sin codigo"}`}
        actions={
          <Button asChild variant="secondary">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver
            </Link>
          </Button>
        }
      />

      {query.imageSaved ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Foto actualizada.</div> : null}
      {query.supplierSaved ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Proveedor asociado.</div> : null}
      {query.warehouseSettingSaved ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Parametros por bodega actualizados.</div> : null}
      {query.error === "image-required" ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">Selecciona una imagen.</div> : null}
      {query.error === "image-type" ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">La imagen debe ser PNG, JPG, JPEG o WEBP.</div> : null}
      {query.error === "image-size" ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">La imagen no puede superar 5 MB.</div> : null}

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Foto del producto</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="aspect-video w-full object-cover" />
            ) : (
              <div className="grid aspect-video place-items-center text-sm text-slate-500">Sin foto</div>
            )}
          </div>
          <form action={uploadProductImage} className="mt-4 space-y-3">
            <input type="hidden" name="productId" value={product.id} />
            <input name="image" type="file" accept="image/png,image/jpeg,image/webp" required className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
            <Button type="submit" variant="secondary">
              <ImageUp className="h-4 w-4" aria-hidden="true" />
              Subir foto
            </Button>
          </form>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Parametros de compra</h2>
          <form action={linkProductSupplier} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Proveedor">
              <SelectInput name="supplierId" required defaultValue="">
                <option value="" disabled>Seleccionar</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.code} - {supplier.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="SKU proveedor">
              <TextInput name="supplierSku" />
            </Field>
            <Field label="Unidad compra">
              <SelectInput name="purchaseUnitId" defaultValue="">
                <option value="">Unidad base</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</option>)}
              </SelectInput>
            </Field>
            <Field label="Costo ultimo">
              <TextInput name="lastPurchaseCost" type="number" min="0" step="0.01" defaultValue="0" />
            </Field>
            <Field label="Minimo compra">
              <TextInput name="minPurchaseQuantity" type="number" min="0" step="0.000001" defaultValue="0" />
            </Field>
            <Field label="Multiplo compra">
              <TextInput name="purchaseMultiple" type="number" min="0.000001" step="0.000001" defaultValue="1" />
            </Field>
            <Field label="Lead time dias">
              <TextInput name="leadTimeDays" type="number" min="0" step="1" />
            </Field>
            <label className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
              <input name="isPrimary" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700" />
              Proveedor principal
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <Button type="submit" disabled={suppliers.length === 0}>Asociar proveedor</Button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Minimos y maximos por bodega</h2>
        <form action={upsertProductWarehouseSetting} className="mt-4 grid gap-4 lg:grid-cols-5">
          <input type="hidden" name="productId" value={product.id} />
          <Field label="Bodega">
            <SelectInput name="warehouseId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Minimo">
            <TextInput name="minStock" type="number" min="0" step="0.000001" defaultValue="0" />
          </Field>
          <Field label="Maximo">
            <TextInput name="maxStock" type="number" min="0" step="0.000001" defaultValue="0" />
          </Field>
          <Field label="Punto reorden">
            <TextInput name="reorderPoint" type="number" min="0" step="0.000001" defaultValue="0" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={warehouses.length === 0}>Guardar</Button>
          </div>
        </form>
      </section>

      <DataTable columns={["Proveedor", "SKU proveedor", "Unidad", "Min compra", "Multiplo", "Costo", "Lead time", "Principal", "Estado"]}>
        {product.suppliers.map((item) => (
          <tr key={item.id}>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{item.supplier.name}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.supplierSku ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.purchaseUnit?.abbreviation ?? product.baseUnit.abbreviation}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(item.minPurchaseQuantity)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(item.purchaseMultiple)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(item.lastPurchaseCost)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.leadTimeDays ?? item.supplier.leadTimeDays} dias</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.isPrimary ? "Si" : "No"}</td>
            <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={item.status} /></td>
          </tr>
        ))}
      </DataTable>

      <DataTable columns={["Bodega", "Minimo", "Maximo", "Punto reorden", "Estado"]}>
        {warehouseSettings.map((setting) => (
          <tr key={setting.id}>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{setting.warehouse.code} - {setting.warehouse.name}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(setting.minStock)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(setting.maxStock)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(setting.reorderPoint)}</td>
            <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={setting.status} /></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
