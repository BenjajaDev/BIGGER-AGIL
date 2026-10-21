# BIGGER Ágil

Sistema digital a medida para **BIGGER**, cafetería-pastelería de Curicó: comandas por mesa,
vista de cocina en tiempo real y carta digital accesible por QR.

> Proyecto RSU e Innovación Social · Universidad Autónoma de Chile.
> Arquitectura y decisiones: [`docs/architecture.md`](docs/architecture.md) ·
> Contrato de API: [`docs/api/openapi.yaml`](docs/api/openapi.yaml).

## Requisitos

- Node.js ≥ 22.12 (`.nvmrc`)
- pnpm 10 (`corepack enable`)

## Puesta en marcha

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @bigger/api admin:pin   # pide el PIN del encargado y entrega las 2 variables ADMIN_*
                                      # para pegarlas en apps/api/.env
pnpm db:seed   # aplica migraciones y carga el catálogo y los pedidos de ejemplo
pnpm dev       # API en :3000 y web en :5173
```

| URL                                 | Vista                           |
| ----------------------------------- | ------------------------------- |
| http://localhost:5173/mesas         | Mapa de mesas y WhatsApp        |
| http://localhost:5173/pedido        | Toma de pedido                  |
| http://localhost:5173/cocina        | Vista de cocina                 |
| http://localhost:5173/carta         | Carta pública (celular / QR)    |
| http://localhost:5173/configuracion | Configuración de la carta (PIN) |
| http://localhost:5173/bodega        | Módulo «En desarrollo»          |

Para usar la app desde las tablets del local, define `HOST=0.0.0.0` en `apps/api/.env` y
agrega el origen de la tablet a `CORS_ORIGINS`.

## Scripts

| Comando                                 | Qué hace                                           |
| --------------------------------------- | -------------------------------------------------- |
| `pnpm dev`                              | API (tsx watch) y web (Vite) en paralelo           |
| `pnpm build`                            | Build de producción de API (tsup) y web (Vite)     |
| `pnpm check`                            | Formato, lint, typecheck y tests (lo mismo que CI) |
| `pnpm test`                             | Vitest en todos los paquetes                       |
| `pnpm db:migrate`                       | Aplica migraciones pendientes                      |
| `pnpm db:seed`                          | Carga datos de ejemplo (bloqueado en producción)   |
| `pnpm --filter @bigger/api db:generate` | Genera una migración desde `schema.ts`             |
| `pnpm --filter @bigger/api admin:pin`   | Genera el hash del PIN y el secreto de sesión      |

## Estructura

```
apps/
  api/                 Express + Drizzle (MVC)
    drizzle/           Migraciones SQL versionadas
    src/
      config/          Variables de entorno validadas con zod
      core/            Errores, logger, helpers HTTP y middleware
      db/              Esquema, conexión, seed
      modules/<dom>/   routes → controller → service → repository
      realtime/        EventHub + endpoint SSE
      container.ts     Composición de dependencias
    test/              Tests de integración HTTP (supertest + SQLite en memoria)
  web/                 React + Vite
    src/
      app/             Router, navegación, query client
      components/ui/   Átomos: Button, StatusBadge, Chip, QuantityStepper…
      components/layout/  AppShell, TopNav
      features/<mod>/  Páginas, componentes y hooks por módulo
      services/        Acceso HTTP/SSE validado con zod
      styles/          Tokens de diseño y estilos globales
packages/
  shared/              Esquemas zod, tipos de dominio y eventos (API ⇄ web)
docs/                  Arquitectura y OpenAPI
```

## Ramas

El trabajo se integra en `develop`; `main` queda para versiones estables validadas con BIGGER.
