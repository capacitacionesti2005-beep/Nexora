/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { QrCode } from "lucide-react";
import { Field, SelectInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function LocationQrPage({
  searchParams,
}: {
  searchParams?: Promise<{ warehouseId?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const warehouseId = params.warehouseId || undefined;
  const [warehouses, locations] = await Promise.all([
    prisma.warehouse.findMany({
      where: { companyId: user.companyId, status: "ACTIVE" },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { companyId: user.companyId, warehouseId },
      include: { warehouse: true },
      orderBy: [{ warehouse: { code: "asc" } }, { locationCode: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Etiquetas QR de ubicaciones"
        description="Imprime y pega estos codigos en estantes, zonas o posiciones fisicas. Al escanearlos abren la ubicacion exacta."
        actions={
          <div className="no-print flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/locations">Volver</Link>
            </Button>
            <PrintButton label="Imprimir etiquetas" />
          </div>
        }
      />

      <section className="no-print rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Field label="Bodega">
            <SelectInput name="warehouseId" defaultValue={warehouseId ?? ""}>
              <option value="">Todas</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" className="w-full">
              Filtrar etiquetas
            </Button>
          </div>
        </form>
      </section>

      {locations.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No hay ubicaciones para imprimir.
        </section>
      ) : (
        <section className="qr-label-sheet grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((location) => (
            <article key={location.id} className="qr-label rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-4">
                <img
                  src={`/api/locations/${location.id}/qr`}
                  alt={`QR ${location.locationCode}`}
                  className="h-32 w-32 rounded-md border border-slate-200 bg-white p-2"
                />
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                    QR ubicacion
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-950">{location.locationCode}</h2>
                  <p className="mt-1 text-sm text-slate-600">{location.warehouse.code} - {location.warehouse.name}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    Zona: {location.zone ?? "-"} / Pasillo: {location.aisle ?? "-"} / Estante: {location.shelf ?? "-"} / Nivel: {location.level ?? "-"} / Posicion: {location.position ?? "-"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
