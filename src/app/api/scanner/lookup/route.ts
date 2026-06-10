import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) return Response.json({ error: "code-required" }, { status: 400 });

  const product = await prisma.product.findFirst({
    where: {
      companyId: user.companyId,
      status: "ACTIVE",
      OR: [
        { internalCode: { equals: code, mode: "insensitive" } },
        { sku: { equals: code, mode: "insensitive" } },
        { barcode: { equals: code, mode: "insensitive" } },
        { qrCode: { equals: code, mode: "insensitive" } },
      ],
    },
    include: {
      baseUnit: true,
      category: true,
      stocks: {
        include: { warehouse: true, location: true },
        orderBy: [{ warehouse: { code: "asc" } }],
        take: 10,
      },
    },
  });

  if (product) {
    return Response.json({
      type: "product",
      code,
      product: {
        id: product.id,
        internalCode: product.internalCode,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        imageUrl: product.imageUrl,
        category: product.category?.name,
        unit: product.baseUnit.abbreviation,
        stocks: product.stocks.map((stock) => ({
          warehouse: stock.warehouse.code,
          location: stock.location?.locationCode,
          quantity: stock.quantity.toString(),
          availableQuantity: stock.availableQuantity.toString(),
        })),
      },
    });
  }

  const location = await prisma.location.findFirst({
    where: {
      companyId: user.companyId,
      status: "ACTIVE",
      locationCode: { equals: code, mode: "insensitive" },
    },
    include: {
      warehouse: true,
      _count: { select: { stocks: true } },
    },
  });

  if (location) {
    return Response.json({
      type: "location",
      code,
      location: {
        id: location.id,
        locationCode: location.locationCode,
        warehouse: location.warehouse.code,
        zone: location.zone,
        aisle: location.aisle,
        shelf: location.shelf,
        level: location.level,
        position: location.position,
        stocks: location._count.stocks,
      },
    });
  }

  return Response.json({ type: "not-found", code }, { status: 404 });
}
