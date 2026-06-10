import { Field, SelectInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { importCsv } from "@/modules/imports/application/import-actions";

const templateLinks = [
  ["products", "Formato productos"],
  ["categories", "Formato categorias"],
  ["units", "Formato unidades"],
  ["warehouses", "Formato bodegas"],
] as const;

export default async function ImportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ imported?: string; valid?: string; invalid?: string; error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const batches = await prisma.importBatch.findMany({
    where: { companyId: user.companyId },
    include: { createdByUser: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Carga masiva" description="Importacion CSV para maestros iniciales. Encabezados esperados segun tipo seleccionado." />
      {params.imported ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Importacion procesada. Validos: {params.valid ?? 0}. Invalidos: {params.invalid ?? 0}.</div> : null}
      {params.error === "file-required" ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">Selecciona un archivo CSV.</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nueva importacion</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {templateLinks.map(([type, label]) => (
            <a key={type} href={`/api/imports/template?type=${type}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Descargar {label}
            </a>
          ))}
        </div>
        <form action={importCsv} className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr_auto]">
          <Field label="Tipo">
            <SelectInput name="importType" defaultValue="products">
              <option value="products">Productos</option>
              <option value="categories">Categorias</option>
              <option value="units">Unidades</option>
              <option value="warehouses">Bodegas</option>
            </SelectInput>
          </Field>
          <Field label="Archivo CSV">
            <input name="file" type="file" accept=".csv,text/csv" required className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
          </Field>
          <div className="flex items-end">
            <Button type="submit">Importar</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">Productos: internalCode,name,baseUnitAbbreviation,category,sku,barcode. Unidades: name,abbreviation,type. Categorias: name,code,description. Bodegas: code,name,city.</p>
      </section>

      <DataTable columns={["Fecha", "Tipo", "Archivo", "Estado", "Filas", "Validas", "Invalidas", "Usuario"]}>
        {batches.map((batch) => (
          <tr key={batch.id}>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{batch.createdAt.toLocaleString("es-CO")}</td>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{batch.importType}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{batch.fileName}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{batch.status}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{batch.totalRows}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{batch.validRows}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{batch.invalidRows}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{batch.createdByUser.firstName}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
