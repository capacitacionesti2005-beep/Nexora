# Modelo de datos inicial

Entidades principales: Company, User, Role, Permission, RolePermission, Product, Category, UnitOfMeasure, UnitConversion, Warehouse, Location, Stock, InventoryMovement, PhysicalInventory, PhysicalInventoryItem, ImportBatch y AuditLog.

Relaciones clave:

- Company 1:N User, Product, Warehouse, Stock, Movement y AuditLog.
- User N:1 Role y opcionalmente N:1 Warehouse asignada.
- Role N:M Permission mediante RolePermission.
- Product N:1 Category y N:1 UnitOfMeasure base.
- Warehouse 1:N Location.
- Movement referencia producto, unidad, responsable y bodegas/ubicaciones origen-destino.
- PhysicalInventory 1:N PhysicalInventoryItem.
