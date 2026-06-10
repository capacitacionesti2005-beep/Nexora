import { Field, SelectInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInventoryFormatter } from "@/lib/utils/inventory-format";

export default async function KardexPage({
  searchParams,
}: {
  searchParams?: Promise<{ productId?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const [company, products] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true, quantityDecimals: true, costDecimals: true },
    }),
    prisma.product.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
    }),
  ]);
  const format = createInventoryFormatter(company);

  const selectedProductId = params.productId || products[0]?.id;
  const movements = selectedProductId
    ? await prisma.inventoryMovement.findMany({
        where: { companyId: user.companyId, productId: selectedProductId },
        include: {
          unit: true,
          warehouseFrom: true,
          warehouseTo: true,
          locationFrom: true,
          locationTo: true,
          responsibleUser: true,
        },
        orderBy: { movementDate: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Kardex por producto" description="Trazabilidad cronologica de entradas, salidas, transferencias y ajustes." />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Field label="Producto">
            <SelectInput name="productId" defaultValue={selectedProductId ?? ""}>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.internalCode} - {product.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Consultar
            </Button>
          </div>
        </form>
      </section>

      <DataTable columns={["Fecha", "Tipo", "Motivo", "Origen", "Destino", "Cantidad", "Costo unit.", "Total", "Responsable"]}>
        {movements.map((movement) => (
          <tr key={movement.id}>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.movementDate.toLocaleDateString("es-CO")}</td>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{movement.movementType}</td>
            <td className="min-w-64 px-4 py-3 text-slate-600">{movement.movementReason}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
              {movement.warehouseFrom?.code ?? "-"} / {movement.locationFrom?.locationCode ?? "-"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
              {movement.warehouseTo?.code ?? "-"} / {movement.locationTo?.locationCode ?? "-"}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
              {format.signedQuantity(movement.movementType, movement.quantity)} {movement.unit.abbreviation}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(movement.unitCost)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format.cost(movement.totalCost)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{movement.responsibleUser.firstName}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
