import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) return Response.json({ results: [] });

  const [products, warehouses, locations, suppliers, movements, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { internalCode: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
          { barcode: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { category: true },
      orderBy: { name: "asc" },
      take: 6,
    }),
    prisma.warehouse.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { code: "asc" },
      take: 4,
    }),
    prisma.location.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { locationCode: { contains: query, mode: "insensitive" } },
          { zone: { contains: query, mode: "insensitive" } },
          { aisle: { contains: query, mode: "insensitive" } },
          { shelf: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { warehouse: true },
      orderBy: { locationCode: "asc" },
      take: 4,
    }),
    prisma.supplier.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { taxId: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 4,
    }),
    prisma.inventoryMovement.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { documentNumber: { contains: query, mode: "insensitive" } },
          { movementReason: { contains: query, mode: "insensitive" } },
          { product: { name: { contains: query, mode: "insensitive" } } },
          { product: { internalCode: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.category.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 4,
    }),
  ]);

  const results = [
    ...products.map((product) => ({
      id: `product-${product.id}`,
      type: "Producto",
      title: `${product.internalCode} - ${product.name}`,
      subtitle: product.category?.name ?? product.sku ?? product.barcode ?? "Producto",
      href: `/products/${product.id}`,
    })),
    ...warehouses.map((warehouse) => ({
      id: `warehouse-${warehouse.id}`,
      type: "Bodega",
      title: `${warehouse.code} - ${warehouse.name}`,
      subtitle: warehouse.city ?? warehouse.type,
      href: "/warehouses",
    })),
    ...locations.map((location) => ({
      id: `location-${location.id}`,
      type: "Ubicacion",
      title: location.locationCode,
      subtitle: `${location.warehouse.code} / ${location.zone ?? "Sin zona"}`,
      href: `/locations/${location.id}/scan`,
    })),
    ...suppliers.map((supplier) => ({
      id: `supplier-${supplier.id}`,
      type: "Proveedor",
      title: `${supplier.code} - ${supplier.name}`,
      subtitle: supplier.taxId ?? supplier.city ?? "Proveedor",
      href: "/suppliers",
    })),
    ...movements.map((movement) => ({
      id: `movement-${movement.id}`,
      type: "Movimiento",
      title: `${movement.movementType} - ${movement.product.name}`,
      subtitle: movement.documentNumber ?? movement.movementReason,
      href: `/stock/kardex?productId=${movement.productId}`,
    })),
    ...categories.map((category) => ({
      id: `category-${category.id}`,
      type: "Categoria",
      title: category.name,
      subtitle: category.code ?? category.description ?? "Categoria",
      href: "/categories",
    })),
  ].slice(0, 12);

  return Response.json({ results });
}
