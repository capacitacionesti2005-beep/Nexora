import { Link2, PackageMinus, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Field, SelectInput, TextArea, TextInput } from "@/components/forms/field";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";
import { consumeMaintenancePart, createTransportVehicle } from "@/modules/transport/application/transport-integration-actions";

function decimalToNumber(input: unknown) {
  if (input && typeof input === "object" && "toNumber" in input && typeof input.toNumber === "function") {
    return input.toNumber();
  }

  return Number(input ?? 0);
}

export async function TransportInventoryBridge({
  companyId,
  searchParams,
}: {
  companyId: string;
  searchParams?: { vehicleSaved?: string; partConsumed?: string; error?: string; prefillVehicleId?: string; prefillPlate?: string; prefillComponentLabel?: string; intent?: string };
}) {
  const [company, vehicles, warehouses, products, recentParts] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.transportVehicle.findMany({
      where: { companyId },
      orderBy: [{ status: "asc" }, { plate: "asc" }],
      take: 50,
    }),
    prisma.warehouse.findMany({
      where: { companyId, status: "ACTIVE" },
      orderBy: { code: "asc" },
      take: 50,
    }),
    prisma.product.findMany({
      where: { companyId, status: "ACTIVE" },
      include: {
        baseUnit: true,
        stocks: {
          where: { companyId, availableQuantity: { gt: 0 } },
          select: { availableQuantity: true, warehouse: { select: { code: true } } },
        },
      },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.transportMaintenancePart.findMany({
      where: { companyId },
      include: {
        product: true,
        warehouse: true,
        maintenanceOrder: { include: { vehicle: true } },
        inventoryMovement: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const format = createInventoryFormatter(company);

  return (
    <section className="space-y-4 rounded-lg border border-cyan-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Puente Inventario-Transporte
          </div>
          <h2 className="mt-2 text-lg font-black text-slate-950">Mantenimiento que descuenta inventario real</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Cada repuesto consumido por un vehiculo genera salida de inventario, movimiento auditado y costo asociado al mantenimiento.
          </p>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <Metric label="Vehiculos" value={vehicles.length.toString()} />
          <Metric label="Repuestos con stock" value={products.filter((product) => product.stocks.length > 0).length.toString()} />
          <Metric label="Consumos" value={recentParts.length.toString()} />
        </div>
      </div>

      {searchParams?.vehicleSaved ? <Alert tone="success">Vehiculo guardado y disponible para mantenimiento.</Alert> : null}
      {searchParams?.partConsumed ? <Alert tone="success">Repuesto consumido: se desconto stock y se creo movimiento de salida.</Alert> : null}
      {searchParams?.error === "insufficient-stock" ? <Alert tone="danger">No hay stock disponible suficiente en la bodega seleccionada.</Alert> : null}
      {searchParams?.intent === "reserve" ? <Alert tone="success">Flujo de repuesto abierto desde estado visual para {searchParams.prefillPlate ?? "vehiculo"}{searchParams.prefillComponentLabel ? ` / ${searchParams.prefillComponentLabel}` : ""}.</Alert> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Opportunity title="Mantenimiento predictivo con inventario" text="Anticipar fallas y reservar repuestos antes de que el vehiculo quede parado." />
        <Opportunity title="Costo real por placa" text="Combustible, llantas, repuestos, mano de obra y anticipos en una sola rentabilidad." />
        <Opportunity title="Riesgo y seguridad operacional" text="Alertas de desvio, parada no autorizada, checklist fallido y conductor en riesgo." />
        <Opportunity title="Auditoria automatica" text="Cada gasto, repuesto y flete queda trazado contra orden, vehiculo, usuario y stock." />
      </div>

      <DataTable columns={["Placa", "Tipo", "Clase", "Llantas", "Carroceria", "Refrigerado", "Estado visual"]}>
        {vehicles.length ? (
          vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">{vehicle.plate}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{vehicle.type}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{vehicle.vehicleClass}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{vehicle.wheelCount}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{vehicle.trailerType ?? vehicle.bodyType}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{vehicle.refrigerated ? "Si" : "No"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <Link
                  href={`/transport/fleet/${encodeURIComponent(vehicle.plate)}`}
                  className="inline-flex min-h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  Ver estado visual
                </Link>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
              Registra el primer vehiculo para generar sus componentes controlados.
            </td>
          </tr>
        )}
      </DataTable>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <form action={createTransportVehicle} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-cyan-700" aria-hidden="true" />
            <h3 className="text-sm font-black text-slate-950">Registrar vehiculo real</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Placa">
              <TextInput name="plate" placeholder="TRK-482" required />
            </Field>
            <Field label="Nombre / tipo comercial">
              <TextInput name="type" placeholder="Turbo 4.5T, Patineta 32T, Van refrigerada" required />
            </Field>
            <Field label="Clase vehiculo">
              <SelectInput name="vehicleClass" defaultValue="TRUCK">
                <option value="VAN">Van / furgon liviano</option>
                <option value="TRUCK">Camion / turbo / sencillo</option>
                <option value="TRACTOR">Tractomula / patineta</option>
                <option value="RIGID">Rigido pesado</option>
              </SelectInput>
            </Field>
            <Field label="Cantidad de llantas">
              <SelectInput name="wheelCount" defaultValue="6">
                <option value="4">4 llantas</option>
                <option value="6">6 llantas</option>
                <option value="8">8 llantas</option>
                <option value="10">10 llantas</option>
                <option value="12">12 llantas</option>
                <option value="18">18 llantas</option>
                <option value="22">22 llantas</option>
              </SelectInput>
            </Field>
            <Field label="Carroceria">
              <SelectInput name="bodyType" defaultValue="Furgon">
                <option>Furgon</option>
                <option>Estacas</option>
                <option>Carpa</option>
                <option>Planchon</option>
                <option>Tanque</option>
                <option>Portacontenedor</option>
                <option>Refrigerado</option>
              </SelectInput>
            </Field>
            <Field label="Trailer / remolque">
              <SelectInput name="trailerType" defaultValue="">
                <option value="">Sin trailer</option>
                <option>Trailer metalico</option>
                <option>Trailer refrigerado</option>
                <option>Trailer con carpa</option>
                <option>Cama baja</option>
                <option>Contenedor</option>
              </SelectInput>
            </Field>
            <Field label="Capacidad">
              <TextInput name="capacity" placeholder="4.5 ton" />
            </Field>
            <Field label="Odometro">
              <TextInput name="odometer" type="number" min="0" step="1" defaultValue="0" />
            </Field>
            <Field label="Zona">
              <TextInput name="currentZone" placeholder="Cedi Funza" />
            </Field>
            <label className="flex min-h-10 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
              <input name="refrigerated" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700" />
              Tiene refrigeracion
            </label>
            <label className="flex min-h-10 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
              <input name="hasLiftGate" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700" />
              Tiene compuerta / plataforma
            </label>
            <div className="sm:col-span-2">
              <Field label="Notas">
                <TextArea name="notes" placeholder="Documentos, restricciones o detalle operativo" />
              </Field>
            </div>
          </div>
          <Button type="submit" className="mt-4">
            Guardar vehiculo
          </Button>
        </form>

        <form action={consumeMaintenancePart} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <PackageMinus className="h-4 w-4 text-cyan-700" aria-hidden="true" />
            <h3 className="text-sm font-black text-slate-950">Consumir repuesto desde inventario</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Vehiculo">
              <SelectInput name="vehicleId" required defaultValue={searchParams?.prefillVehicleId ?? ""}>
                <option value="" disabled>
                  Seleccionar
                </option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.type}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Repuesto / insumo">
              <SelectInput name="productId" required defaultValue="">
                <option value="" disabled>
                  Seleccionar
                </option>
                {products.map((product) => {
                  const available = product.stocks.reduce((sum, stock) => sum + decimalToNumber(stock.availableQuantity), 0);
                  return (
                    <option key={product.id} value={product.id} disabled={available <= 0}>
                      {product.internalCode} - {product.name} ({format.quantity(available)} {product.baseUnit.abbreviation})
                    </option>
                  );
                })}
              </SelectInput>
            </Field>
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
            <Field label="Cantidad">
              <TextInput name="quantity" type="number" min="0.000001" step="0.000001" required />
            </Field>
            <Field label="Tipo mantenimiento">
              <SelectInput name="maintenanceType" defaultValue="Correctivo">
                <option>Correctivo</option>
                <option>Preventivo</option>
                <option>Predictivo</option>
                <option>Checklist</option>
              </SelectInput>
            </Field>
            <Field label="Odometro">
              <TextInput name="odometer" type="number" min="0" step="1" />
            </Field>
            <div className="md:col-span-2 xl:col-span-3">
              <Field label="Notas">
                <TextArea name="notes" placeholder="Ej. cambio de aceite, filtro, llanta o novedad de checklist" />
              </Field>
            </div>
          </div>
          <Button type="submit" className="mt-4" disabled={vehicles.length === 0 || warehouses.length === 0 || products.length === 0}>
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Consumir y descontar stock
          </Button>
        </form>
      </div>

      <DataTable columns={["Fecha", "Vehiculo", "Orden taller", "Producto", "Bodega", "Cantidad", "Costo", "Movimiento"]}>
        {recentParts.length ? (
          recentParts.map((part) => (
            <tr key={part.id}>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{part.createdAt.toLocaleDateString("es-CO")}</td>
              <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">{part.maintenanceOrder.vehicle.plate}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{part.maintenanceOrder.code}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{part.product.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{part.warehouse.code}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{format.quantity(part.quantity)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{format.cost(part.totalCost)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{part.inventoryMovement?.documentNumber ?? "-"}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
              Aun no hay consumos conectados a inventario.
            </td>
          </tr>
        )}
      </DataTable>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <strong className="mt-1 block text-lg font-black text-slate-950">{value}</strong>
    </div>
  );
}

function Opportunity({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
    </article>
  );
}

function Alert({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  return (
    <div className={tone === "success" ? "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700" : "rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"}>
      {children}
    </div>
  );
}
