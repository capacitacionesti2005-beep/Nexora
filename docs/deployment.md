# Publicacion de Nexora

## Objetivo

Publicar una demo comercial de Nexora con inventarios y transporte integrados, accesible por URL publica para presentaciones con clientes.

## Requisitos de produccion

- Hosting compatible con Next.js.
- PostgreSQL publico o gestionado.
- Variables de entorno configuradas en el hosting.
- Migraciones aplicadas con Prisma.
- Seed ejecutado para crear la empresa y usuario demo.

## Variables

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/nexora?schema=public&sslmode=require"
NEXTAUTH_URL="https://TU-DOMINIO"
NEXTAUTH_SECRET="VALOR-LARGO-Y-SEGURO"
```

## Comandos

```bash
npm install
npm run db:deploy
npm run db:seed
npm run build
npm run start
```

## Usuario demo

- Correo: `admin@nexora.local`
- Contrasena: `Admin12345!`

## Usuario socia comercial

- Correo: `ingnataly@gmail.com`
- Contrasena: `Nexora2026!`

## Checklist antes de mostrar clientes

- Confirmar que `/login` carga por HTTPS.
- Iniciar sesion con el usuario demo.
- Abrir `/dashboard`.
- Abrir `/transport`.
- Cambiar la contrasena demo si la URL queda publica por mas de una reunion.
- Evitar cargar datos reales de clientes en el ambiente demo.
