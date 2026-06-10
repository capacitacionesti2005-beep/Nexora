import { Field, SelectInput, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { updateCompanySettings } from "@/modules/companies/application/company-actions";

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ updated?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });

  return (
    <div className="space-y-6">
      <PageHeader title="Configuracion" description="Parametros generales de la empresa activa. Estos cambios aplican a toda la plataforma Nexora." />
      {params.updated ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Configuracion actualizada.</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Datos de empresa</h2>
        <form action={updateCompanySettings} className="mt-4 grid gap-4 lg:grid-cols-3">
          <Field label="Nombre">
            <TextInput name="name" required defaultValue={company.name} />
          </Field>
          <Field label="NIT / Identificacion">
            <TextInput name="taxId" required defaultValue={company.taxId} />
          </Field>
          <Field label="Sector">
            <TextInput name="sector" defaultValue={company.sector ?? ""} />
          </Field>
          <Field label="Direccion">
            <TextInput name="address" defaultValue={company.address ?? ""} />
          </Field>
          <Field label="Ciudad">
            <TextInput name="city" defaultValue={company.city ?? ""} />
          </Field>
          <Field label="Pais">
            <TextInput name="country" required defaultValue={company.country} />
          </Field>
          <Field label="Moneda">
            <TextInput name="currency" required defaultValue={company.currency} />
          </Field>
          <Field label="Logo URL">
            <TextInput name="logoUrl" type="url" defaultValue={company.logoUrl ?? ""} />
          </Field>
          <Field label="Tema de la plataforma">
            <SelectInput name="uiTheme" defaultValue={company.uiTheme}>
              <option value="dark">Oscuro</option>
              <option value="light">Claro</option>
              <option value="system">Sistema operativo</option>
            </SelectInput>
          </Field>
          <Field label="Densidad visual">
            <SelectInput name="uiDensity" defaultValue={company.uiDensity}>
              <option value="comfortable">Comoda</option>
              <option value="compact">Compacta</option>
            </SelectInput>
          </Field>
          <Field label="Color principal">
            <SelectInput name="accentColor" defaultValue={company.accentColor}>
              <option value="emerald">Verde</option>
              <option value="blue">Azul</option>
              <option value="cyan">Cian</option>
              <option value="violet">Violeta</option>
            </SelectInput>
          </Field>
          <Field label="Decimales cantidad">
            <TextInput name="quantityDecimals" type="number" min="0" max="6" defaultValue={company.quantityDecimals} />
          </Field>
          <Field label="Decimales costo">
            <TextInput name="costDecimals" type="number" min="0" max="6" defaultValue={company.costDecimals} />
          </Field>
          <Field label="Metodo de costeo">
            <SelectInput name="costingMethod" defaultValue={company.costingMethod}>
              <option value="AVERAGE">Promedio ponderado</option>
              <option value="STANDARD">Estandar</option>
            </SelectInput>
          </Field>
          <div className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-slate-950">Utilidades operativas</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                ["skuRequired", "SKU obligatorio", company.skuRequired],
                ["barcodeRequired", "Codigo obligatorio", company.barcodeRequired],
                ["allowNegativeStock", "Permitir stock negativo", company.allowNegativeStock],
                ["scannerRequireLocation", "Escaneo exige ubicacion", company.scannerRequireLocation],
                ["scannerRequireUnit", "Escaneo exige unidad", company.scannerRequireUnit],
              ].map(([name, label, checked]) => (
                <label key={name.toString()} className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                  <input name={name.toString()} type="checkbox" defaultChecked={Boolean(checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700" />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-end lg:col-span-3">
            <Button type="submit">Guardar configuracion</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
