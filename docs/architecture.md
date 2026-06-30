# Arquitectura Nexora

Monolito modular full stack con Next.js App Router, TypeScript, PostgreSQL y Prisma. La separacion por dominios permite operar inventarios y transporte en una suite integrada, y crecer hacia compras, ventas, activos, produccion e integraciones sin partir el sistema antes de tiempo.

## Capas

- `app`: rutas, layouts, paginas y endpoints.
- `components`: UI reutilizable y layout.
- `modules`: dominios de negocio con application, domain e infrastructure cuando el modulo lo requiera.
- `lib`: servicios transversales de auth, db, permisos, seguridad y utilidades.
- `prisma`: schema, migraciones y seed.

## Decisiones

- `InventoryMovement` sera la fuente de verdad para cambios de stock.
- `Stock` sera saldo operativo derivado y actualizado solo por casos de uso transaccionales.
- Toda entidad operativa tendra `companyId` para aislamiento multiempresa.
- RBAC se modela desde fase 1 con roles, permisos y permisos por rol.
- Inventario Rapido Inteligente se soporta desde el modelo con ubicaciones, conteos fisicos y diferencias.
- Transporte opera como modulo integrado para flota, conductores, rutas, combustible, mantenimientos y sincronizacion con inventarios.
