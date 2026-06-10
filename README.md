# Inventra360

Plataforma web SaaS para gestion de inventarios multisector, preparada para multiempresa, roles, trazabilidad, movimientos de stock e Inventario Rapido Inteligente.

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- npm

## Configuracion

1. Copiar `.env.example` a `.env`.
2. Ajustar `DATABASE_URL` y `NEXTAUTH_SECRET`.
3. Ejecutar migraciones y seed.

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Usuario demo creado por seed:

- Correo: `admin@inventra360.local`
- Contrasena: `Admin12345!`

## Scripts

- `npm run dev`: servidor local.
- `npm run build`: build productivo.
- `npm run lint`: ESLint.
- `npm run typecheck`: validacion TypeScript.
- `npm run db:generate`: genera Prisma Client.
- `npm run db:migrate`: crea/aplica migraciones.
- `npm run db:seed`: datos base.
- `npm run db:studio`: Prisma Studio.
