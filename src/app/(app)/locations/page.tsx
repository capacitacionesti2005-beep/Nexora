import Link from "next/link";
import { MapPin, QrCode } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createLocation } from "@/modules/inventory/application/master-actions";

export default async function LocationsPage() {
  const user = await requireUser();
  const [warehouses, locations] = await Promise.all([
    prisma.warehouse.findMany({
      where: { companyId: user.companyId, status: "ACTIVE" },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { companyId: user.companyId },
      include: { warehouse: true, _count: { select: { stocks: true } } },
      orderBy: [{ status: "asc" }, { locationCode: "asc" }],
    }),
  ]);
  const locationsByWarehouse = warehouses.map((warehouse) => ({
    warehouse,
    zones: Array.from(
      locations
        .filter((location) => location.warehouseId === warehouse.id)
        .reduce((map, location) => {
          const zone = location.zone || "Sin zona";
          const current = map.get(zone) ?? [];
          current.push(location);
          map.set(zone, current);
          return map;
        }, new Map<string, typeof locations>()),
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ubicaciones"
        description="Estructura fisica por bodega, zona, pasillo, estante, nivel y posicion para conteo rapido y QR."
        actions={
          <Button asChild variant="secondary">
            <Link href="/locations/qr">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              Imprimir QR
            </Link>
          </Button>
        }
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nueva ubicacion</h2>
        <form action={createLocation} className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Bodega">
            <SelectInput name="warehouseId" required defaultValue="">
              <option value="" disabled>
                Seleccionar
              </option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Codigo ubicacion">
            <TextInput name="locationCode" required placeholder="BOD-01/P-02/E-04" />
          </Field>
          <Field label="Zona">
            <TextInput name="zone" placeholder="Zona A" />
          </Field>
          <Field label="Pasillo">
            <TextInput name="aisle" placeholder="P-02" />
          </Field>
          <Field label="Estante">
            <TextInput name="shelf" placeholder="E-04" />
          </Field>
          <Field label="Nivel">
            <TextInput name="level" placeholder="N-03" />
          </Field>
          <Field label="Posicion">
            <TextInput name="position" placeholder="POS-08" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={warehouses.length === 0}>
              Guardar ubicacion
            </Button>
          </div>
          <div className="lg:col-span-4">
            <Field label="Descripcion">
              <TextArea name="description" placeholder="Referencia visual o instrucciones de acceso." />
            </Field>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Mapa visual de ubicaciones</h2>
            <p className="text-sm text-slate-500">Vista por bodega, zona y pasillo. Sirve para operación y conteo rápido; el plano gráfico avanzado queda como mejora posterior.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {locationsByWarehouse.map(({ warehouse, zones }) => (
            <div key={warehouse.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-950">{warehouse.code} - {warehouse.name}</h3>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {zones.reduce((total, [, zoneLocations]) => total + zoneLocations.length, 0)} ubicaciones
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {zones.length === 0 ? <p className="text-sm text-slate-500">Sin ubicaciones registradas.</p> : null}
                {zones.map(([zone, zoneLocations]) => (
                  <div key={zone} className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-700">{zone}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {zoneLocations.map((location) => (
                        <Link key={location.id} href={`/locations/${location.id}/scan`} className="rounded-md border border-emerald-100 bg-emerald-50 p-2 transition hover:border-emerald-300 hover:bg-white">
                          <p className="flex items-center gap-1 truncate text-xs font-semibold text-emerald-900">
                            <QrCode className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {location.locationCode}
                          </p>
                          <p className="mt-1 truncate text-xs text-emerald-700">
                            {location.aisle ?? "P/S"} - {location.shelf ?? "E/S"} - {location.level ?? "N/S"} - {location.position ?? "POS/S"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {locations.length === 0 ? (
        <EmptyState icon={MapPin} title="Sin ubicaciones" description="Crea ubicaciones para preparar conteo fisico, escaneo y QR de bodega." />
      ) : (
        <DataTable columns={["Codigo", "Bodega", "Zona", "Pasillo", "Estante", "Nivel", "Posicion", "Saldos", "Estado", "QR"]}>
          {locations.map((location) => (
            <tr key={location.id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                <Link href={`/locations/${location.id}/scan`} className="text-emerald-700 hover:underline">
                  {location.locationCode}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{location.warehouse.code}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{location.zone ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{location.aisle ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{location.shelf ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{location.level ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{location.position ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{location._count.stocks}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={location.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Link href={`/locations/${location.id}/scan`} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                  Escanear
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
