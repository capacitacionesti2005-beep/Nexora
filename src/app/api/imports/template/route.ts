import { csvResponse, toCsv } from "@/lib/utils/csv";

const templates: Record<string, { filename: string; headers: string[]; rows: unknown[][] }> = {
  products: {
    filename: "formato-productos.csv",
    headers: ["internalCode", "name", "baseUnitAbbreviation", "category", "sku", "barcode"],
    rows: [["PROD-001", "Producto ejemplo", "UND", "Categoria ejemplo", "SKU-001", "770000000001"]],
  },
  categories: {
    filename: "formato-categorias.csv",
    headers: ["name", "code", "description"],
    rows: [["Categoria ejemplo", "CAT-001", "Descripcion opcional"]],
  },
  units: {
    filename: "formato-unidades.csv",
    headers: ["name", "abbreviation", "type"],
    rows: [["Unidad", "UND", "Cantidad"]],
  },
  warehouses: {
    filename: "formato-bodegas.csv",
    headers: ["code", "name", "city"],
    rows: [["BOD-01", "Bodega principal", "Bogota"]],
  },
  physicalCounts: {
    filename: "formato-conteo-inventario-fisico.csv",
    headers: ["itemId", "countedQuantity", "notes"],
    rows: [["copiar-id-item", "10", "Observacion opcional"]],
  },
};

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type") ?? "products";
  const template = templates[type] ?? templates.products;
  return csvResponse(template.filename, toCsv(template.headers, template.rows));
}
