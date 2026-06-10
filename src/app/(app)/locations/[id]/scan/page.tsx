import Link from "next/link";
import { Boxes, MapPin, QrCode } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Field, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";
import { countPhysicalInventoryItem } from "@/modules/physical-inventory/application/physical-inventory-actions";

export default async function LocationScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ counted?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const [company, location, activeCountItems] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.location.findFirstOrThrow({
      where: { id, companyId: user.companyId },
      include: {
        warehouse: true,
        stocks: {
          include: {
            product: { include: { baseUnit: true, category: true } },
          },
          orderBy: [{ product: { name: "asc" } }],
        },
      },
    }),
    prisma.physicalInventoryItem.findMany({
      where: {
        locationId: id,
        physicalInventory: {
          companyId: user.companyId,
          status: { in: ["COUNTING", "REVIEW"] },
        },
      },
      include: {
        physicalInventory: true,
        product: { include: { baseUnit: true, category: true } },
        unit: true,
        responsibleUser: true,
      },
      orderBy: [{ physicalInventory: { createdAt: "desc" } }, { product: { name: "asc" } }],
    }),
  ]);
  const format = createInventoryFormatter(company);
  const returnTo = `/locations/${location.id}/scan?counted=1`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Escaneo: ${location.locationCode}`}
        description="Ubicacion identificada por QR. Desde aqui el operario valida saldos, producto esperado y datos fisicos."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/locations">Ubicaciones</Link>
            </Button>
            <Button asChild>
              <Link href="/physical-inventory">Inventario fisico</Link>
            </Button>
          </div>
        }
      />
      {query.counted ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Conteo registrado desde QR.</div> : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">{location.warehouse.code} - {location.warehouse.name}</h2>
              <p className="text-sm text-slate-500">Bodega asociada al codigo escaneado.</p>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">Zona</dt>
              <dd className="mt-1 font-semibold text-slate-950">{location.zone ?? "-"}</dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">Pasillo</dt>
              <dd className="mt-1 font-semibold text-slate-950">{location.aisle ?? "-"}</dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">Estante</dt>
              <dd className="mt-1 font-semibold text-slate-950">{location.shelf ?? "-"}</dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">Nivel / posicion</dt>
              <dd className="mt-1 font-semibold text-slate-950">{location.level ?? "-"} / {location.position ?? "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Uso operativo</h2>
              <p className="text-sm text-slate-500">Este QR confirma la ubicacion fisica antes del conteo.</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            En una jornada de inventario, escanea la ubicacion, valida los productos esperados y registra el conteo real en el modulo de inventario fisico.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Conteo fisico por QR</h2>
            <p className="text-sm text-slate-500">Registra cantidades reales de las jornadas activas para esta ubicacion y adjunta evidencia fotografica.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/physical-inventory">Gestionar jornadas</Link>
          </Button>
        </div>

        {activeCountItems.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            No hay jornadas activas con items para esta ubicacion. Crea una jornada desde Inventario fisico para habilitar conteo por QR.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {activeCountItems.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-normal text-emerald-700">{item.physicalInventory.code}</p>
                    <h3 className="mt-1 truncate text-base font-semibold text-slate-950">{item.product.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.product.internalCode} / {item.product.category?.name ?? "Sin categoria"} / {item.unit.abbreviation}
                    </p>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{item.status}</span>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500">Sistema</p>
                    <p className="mt-1 font-semibold text-slate-950">{item.physicalInventory.isBlindCount ? "Oculto" : format.quantity(item.systemQuantity)}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500">Contado</p>
                    <p className="mt-1 font-semibold text-slate-950">{item.countedQuantity !== null ? format.quantity(item.countedQuantity) : "-"}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500">Diferencia</p>
                    <p className="mt-1 font-semibold text-slate-950">{format.quantity(item.difference)}</p>
                  </div>
                </div>

                {item.evidenceImageUrl ? (
                  <a href={item.evidenceImageUrl} target="_blank" className="mt-3 block text-sm font-medium text-emerald-700 hover:underline">
                    Ver evidencia cargada
                  </a>
                ) : null}

                <form action={countPhysicalInventoryItem} className="mt-4 grid gap-3">
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="countSource" value="QR" />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <Field label="Cantidad contada">
                    <TextInput name="countedQuantity" type="number" min="0" step="0.000001" required defaultValue={item.countedQuantity?.toString() ?? ""} />
                  </Field>
                  <Field label="Evidencia fotografica">
                    <input name="evidenceImage" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Observacion">
                    <TextArea name="notes" defaultValue={item.notes ?? ""} placeholder="Caja abierta, producto reubicado, sobrante, faltante..." />
                  </Field>
                  <Button type="submit">Guardar conteo QR</Button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      {location.stocks.length === 0 ? (
        <EmptyState icon={Boxes} title="Sin saldos en esta ubicacion" description="La ubicacion existe, pero todavia no tiene stock registrado." />
      ) : (
        <DataTable columns={["Producto", "Codigo", "Categoria", "Cantidad", "Disponible", "Costo total", "Lote", "Serial"]}>
          {location.stocks.map((stock) => (
            <tr key={stock.id}>
              <td className="min-w-64 px-4 py-3 font-medium text-slate-950">{stock.product.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.product.internalCode}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.product.category?.name ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(stock.quantity)} {stock.product.baseUnit.abbreviation}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.quantity(stock.availableQuantity)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(stock.totalCost)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.lotNumber ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{stock.serialNumber ?? "-"}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
