# Backlog tecnico MVP

## Fase 1

- Proyecto base Next.js, TypeScript y Tailwind.
- PostgreSQL con Prisma.
- Schema inicial multiempresa.
- Seed de empresa demo, roles, permisos, unidad y bodega base.
- Auth con credenciales.
- Proteccion de rutas privadas.
- Layout principal y sidebar.
- Dashboard inicial vacio.

## Fase 2

- CRUD inicial productos: listado y creacion.
- CRUD inicial categorias: listado y creacion.
- CRUD inicial unidades: listado y creacion.
- CRUD inicial bodegas: listado y creacion.
- CRUD inicial ubicaciones: listado y creacion.
- Factores de conversion por producto.
- Pendiente para post-MVP: edicion granular, inactivacion controlada avanzada, filtros, busqueda y paginacion dedicada.

## Fase 3

- Entradas: formulario inicial, movimiento auditado y aumento transaccional de stock.
- Salidas: formulario inicial, validacion de disponibilidad, movimiento auditado y descuento transaccional de stock.
- Stock actual: consulta real por producto, bodega, ubicacion, lote, serial y vencimiento.
- Transferencias: descuento de origen y aumento de destino en una transaccion.
- Ajustes aprobados: positivos y negativos, auditados y con validacion de disponibilidad.
- Kardex por producto.
- Pendiente para post-MVP: busqueda avanzada, filtros persistentes, paginacion dedicada y detalle modal de movimientos.

## Fase 4

- Dashboard con metricas reales iniciales.
- Reportes CSV: inventario general, movimientos y kardex.
- Pendiente para post-MVP: graficas avanzadas y PDF.

## Fase 5

- Inventario fisico: crear jornada, generar items desde stock, conteo ciego, registrar conteos y aprobar diferencias con ajustes automaticos.
- Pendiente para post-MVP: segundo conteo, asignacion multiple de responsables y formatos PDF/Excel refinados.

## Fase 6

- Carga masiva CSV: productos, categorias, unidades y bodegas.
- Historial de importaciones.
- Pendiente para post-MVP: mapeo asistido de columnas, vista previa editable y plantillas descargables XLSX.

## Administracion

- Usuarios: creacion, listado, rol, estado y bodega asignada.
- Roles: creacion y asignacion de permisos.
- Configuracion general de empresa.
- Auditoria consultable.

## Riesgos

- Inconsistencia de stock si se permite editar saldos manualmente.
- Fuga de datos entre empresas si faltan filtros por companyId.
- Importaciones masivas con datos incompletos o duplicados.
- Complejidad de costeo promedio si no se encapsula en casos de uso.
- Escaneo movil dependiente de camara, navegador y calidad del codigo.
