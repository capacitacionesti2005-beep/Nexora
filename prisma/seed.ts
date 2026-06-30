import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const permissions = [
  ["dashboard.view", "Ver dashboard"],
  ["products.view", "Ver productos"],
  ["products.create", "Crear productos"],
  ["products.edit", "Editar productos"],
  ["products.delete", "Eliminar productos"],
  ["movements.view", "Ver movimientos"],
  ["entries.create", "Crear entradas"],
  ["outputs.create", "Crear salidas"],
  ["adjustments.approve", "Aprobar ajustes"],
  ["costs.view", "Ver costos"],
  ["exports.run", "Exportar informacion"],
  ["imports.run", "Importar informacion"],
  ["users.manage", "Administrar usuarios"],
  ["audit.view", "Ver auditoria"],
  ["settings.manage", "Administrar configuracion"],
] as const;

const roleDefinitions = [
  { name: "Superadministrador", description: "Acceso total a la plataforma.", permissions: permissions.map(([code]) => code) },
  { name: "Administrador de empresa", description: "Administra una empresa.", permissions: permissions.map(([code]) => code).filter((code) => code !== "settings.manage") },
  { name: "Jefe de inventario", description: "Controla maestros, movimientos e inventarios.", permissions: ["dashboard.view", "products.view", "products.create", "products.edit", "movements.view", "entries.create", "outputs.create", "adjustments.approve", "costs.view", "exports.run", "imports.run"] },
  { name: "Auxiliar de bodega", description: "Opera entradas, salidas y conteos.", permissions: ["dashboard.view", "products.view", "movements.view", "entries.create", "outputs.create"] },
  { name: "Auditor", description: "Consulta informacion y auditoria.", permissions: ["dashboard.view", "products.view", "movements.view", "exports.run", "audit.view"] },
  { name: "Consultor", description: "Acceso de solo lectura.", permissions: ["dashboard.view", "products.view", "movements.view"] },
];

async function main() {
  const company = await prisma.company.upsert({
    where: { taxId: "900000000-1" },
    update: {
      inventoryModuleEnabled: true,
      transportModuleEnabled: true,
    },
    create: {
      name: "Empresa Demo Nexora",
      taxId: "900000000-1",
      sector: "Multisector",
      city: "Bogota",
      country: "Colombia",
      currency: "COP",
      inventoryModuleEnabled: true,
      transportModuleEnabled: true,
    },
  });

  for (const [code, name] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name, description: name },
    });
  }

  for (const roleDefinition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: roleDefinition.name } },
      update: { description: roleDefinition.description, isSystem: true },
      create: { companyId: company.id, name: roleDefinition.name, description: roleDefinition.description, isSystem: true },
    });

    const assignedPermissions = await prisma.permission.findMany({ where: { code: { in: roleDefinition.permissions } } });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: assignedPermissions.map((permission: { id: string }) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }

  const adminRole = await prisma.role.findFirstOrThrow({ where: { companyId: company.id, name: "Superadministrador" } });

  await prisma.user.upsert({
    where: { email: "admin@nexora.local" },
    update: { roleId: adminRole.id, status: "ACTIVE" },
    create: {
      companyId: company.id,
      firstName: "Admin",
      lastName: "Nexora",
      email: "admin@nexora.local",
      passwordHash: await bcrypt.hash("Admin12345!", 12),
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "ingnataly@gmail.com" },
    update: { roleId: adminRole.id, status: "ACTIVE", position: "Ingeniera" },
    create: {
      companyId: company.id,
      firstName: "Nataly",
      lastName: "Ingeniera",
      email: "ingnataly@gmail.com",
      passwordHash: await bcrypt.hash("Nexora2026!", 12),
      position: "Ingeniera",
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  await prisma.unitOfMeasure.upsert({
    where: { companyId_abbreviation: { companyId: company.id, abbreviation: "UND" } },
    update: {},
    create: { companyId: company.id, name: "Unidad", abbreviation: "UND", type: "Cantidad" },
  });

  await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "BOD-01" } },
    update: {},
    create: { companyId: company.id, code: "BOD-01", name: "Bodega principal", type: "MAIN", city: "Bogota" },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
