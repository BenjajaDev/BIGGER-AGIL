# BIGGER Ágil · Arquitectura (Fase 1)

Sistema a medida para la cafetería-pastelería BIGGER (Curicó). Este documento fija el modelo
de datos, los contratos y la estructura sobre la que se construyen las fases siguientes.
Contrato de API: [`docs/api/openapi.yaml`](api/openapi.yaml).

## 1. Alcance del MVP

| Módulo                        | Estado        | Incremento  |
| ----------------------------- | ------------- | ----------- |
| Mesas y comandas (+ WhatsApp) | Activo        | INC-3       |
| Carta digital y catálogo      | Activo        | INC-3/4     |
| Vista de cocina               | Activo        | INC-3       |
| Bodega                        | En desarrollo | INC-4       |
| Compras                       | En desarrollo | INC-4       |
| Reportes                      | En desarrollo | INC-5       |
| Clientes (cuentas semanales)  | En desarrollo | Por definir |

Los módulos en desarrollo aparecen en la navegación y muestran la pantalla «En desarrollo».
Para habilitar uno basta con cambiar su entrada en `apps/web/src/app/navigation.ts` a
`status: 'active'` y registrar su ruta.

## 2. Stack

| Capa         | Elección                                                           | Motivo                                                        |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| Monorepo     | pnpm workspaces                                                    | Contratos compartidos sin publicar paquetes                   |
| Contratos    | `packages/shared` con zod                                          | Una sola fuente de verdad: validación en API **y** en la UI   |
| Backend      | Node 22 · Express 5 · TypeScript                                   | Propuesta BIG1-29; Express 5 propaga errores async            |
| Persistencia | SQLite (better-sqlite3) + Drizzle ORM                              | Local, sin servidor, transaccional; migrable a Postgres       |
| Tiempo real  | Server-Sent Events                                                 | Nativo del navegador, reconexión automática, sin dependencias |
| Frontend     | React 19 · Vite 7 · React Router 7                                 | Componentes, code-splitting por ruta                          |
| Datos en UI  | TanStack Query                                                     | Caché + invalidación al recibir eventos SSE                   |
| Estilos      | CSS Modules + tokens CSS                                           | Sin runtime; tokens explícitos de la paleta                   |
| Calidad      | ESLint (strict type-checked, jsx-a11y), Prettier, Vitest, axe-core |                                                               |
| Futuro       | `pdfkit` (API, reportes PDF) · `recharts` (UI, gráficos)           | Ya declarados para INC-5                                      |

## 3. Patrón MVC

```
            ┌──────────────────────────── apps/web (Vista) ───────────────────────────┐
            │ pages → feature components → ui atoms        hooks ⇄ services (fetch)   │
            └──────────────────────────────────▲──────────────────────────────────────┘
                                   REST /api/v1│  SSE /api/v1/events
            ┌──────────────────────────────────┴───── apps/api ───────────────────────┐
 Controlador│ routes → controller (valida con zod, responde { data } / { error })     │
     Modelo │ service (reglas de negocio) → repository (interfaz) → Drizzle/SQLite    │
            └─────────────────────────────────────────────────────────────────────────┘
                         packages/shared: esquemas zod, tipos y eventos
```

- **Modelo**: `modules/*/*.service.ts` (reglas) + `*.repository.ts` (interfaz + implementación
  Drizzle) + `db/schema.ts`. Los servicios dependen de **interfaces** de repositorio que
  devuelven `Promise`, así que cambiar SQLite por Postgres no toca la lógica de negocio.
- **Controlador**: `*.controller.ts` valida la entrada con los esquemas de `shared` y delega
  en el servicio. `*.routes.ts` solo mapea verbos y rutas.
- **Vista**: `apps/web`. La UI nunca llama a `fetch` directamente; usa `services/` (que
  validan la respuesta con zod) a través de hooks de TanStack Query.
- **Composición**: `apps/api/src/container.ts` es el único lugar que conoce las clases
  concretas (inyección de dependencias manual).

## 4. Modelo de datos

```mermaid
erDiagram
  categories ||--o{ products : contiene
  dining_tables ||--o{ orders : "pedidos de mesa"
  orders ||--|{ order_items : incluye
  products ||--o{ order_items : "vendido como"

  categories { text id PK; text slug UK; text name; int sort_order }
  products { text id PK; text category_id FK; text name; text description; int price_clp; json allergens; bool is_available; int sort_order }
  dining_tables { text id PK; int number UK; text label; int sort_order; bool is_active }
  orders { text id PK; text channel; text status; text table_id FK; text customer_name; ts pickup_at; int total_clp; ts created_at }
  order_items { text id PK; text order_id FK; text product_id FK; text product_name; int position; int unit_price_clp; int quantity; json quick_notes; text note }
```

Decisiones:

- **Montos en enteros CLP**: sin decimales ni errores de punto flotante.
- **Snapshot en `order_items`** (`product_name`, `unit_price_clp`): cambiar un precio no
  altera comandas ni reportes pasados.
- **Estado de mesa derivado, no almacenado**: `free` sin pedidos abiertos, `awaiting-payment`
  si todos están entregados, `occupied` en otro caso. Así nunca se desincroniza
  (`apps/api/src/modules/tables/table-overview.ts`).
- **`position`** conserva el orden en que se anotó la comanda.
- Todas las tablas tienen `created_at`/`updated_at` como base para Reportes.

### Ciclo de vida de un pedido

```mermaid
stateDiagram-v2
  [*] --> new: Enviar a cocina
  new --> preparing: Empezar
  preparing --> ready: Marcar listo
  ready --> delivered: Entregado
  delivered --> paid: Cobrar
  new --> cancelled
  preparing --> cancelled
```

Las transiciones viven en `packages/shared/src/domain/orders.ts` (`canTransitionOrder`) y son
las mismas en la API y en la UI.

## 5. Tiempo real

Las mutaciones van por REST. Tras cada cambio, el servicio publica un `RealtimeEvent`
(`order.created` / `order.updated`) en el `EventHub`, y `GET /api/v1/events` lo reenvía por
SSE a todas las tablets. La UI (`useRealtimeSync`) invalida las queries `orders` y `tables`,
y la barra superior muestra «En línea / Reconectando…» con ícono y texto.

## 6. Convenciones de API

- Éxito `{ "data": … }`; error `{ "error": { "code", "message", "issues?" } }`.
- Códigos: `VALIDATION_ERROR` 400 · `NOT_FOUND` 404 · `CONFLICT` 409 ·
  `INVALID_STATE_TRANSITION` 409 · `INTERNAL_ERROR` 500 (sin filtrar detalles internos).
- Toda entrada se valida en el borde HTTP (`parseOrThrow`) y toda respuesta se valida en el
  cliente (`getJson`).
- Variables de entorno validadas con zod al arrancar (`apps/api/src/config/env.ts`,
  `apps/web/src/config/env.ts`): la app no inicia con configuración inválida.

## 7. Sistema de diseño y accesibilidad (WCAG 2.1 AA)

Tokens en `apps/web/src/styles/tokens.css`.

| Rol            | Token                        | Uso                                                                     |
| -------------- | ---------------------------- | ----------------------------------------------------------------------- |
| Carbón         | `--color-carbon-900/700`     | Texto, barra superior, fondo de cocina                                  |
| Crema          | `--color-crema-50/100`       | Fondo general y tarjetas                                                |
| Rojo BIGGER    | `--action-primary`           | **Solo** la acción principal de la vista (`<Button variant="primary">`) |
| Terracota      | `--accent`                   | Categorías activas, «Con pedido», precios de la carta                   |
| Dorado / Ámbar | `--status-highlight/warning` | Destacados y alertas, **siempre con texto carbón**                      |
| Salvia         | `--status-success`           | Listo / disponible                                                      |

Reglas aplicadas en los componentes:

- `StatusBadge` exige ícono + texto: ningún estado depende solo del color.
- Áreas táctiles de al menos `--touch-target` (48 px) en botones, chips, enlaces y steppers.
- Fraunces para títulos y carta; Inter para el sistema interno. Texto mínimo de 14 px.
- Animaciones solo con `transform`/`opacity` (baratas en tablets) y anuladas con
  `prefers-reduced-motion`. La carta pública no usa animaciones.
- Carta: orden de lectura lineal (nombre → precio → descripción → alérgenos), precio
  anunciado como «3.200 pesos», alérgenos siempre en texto, modo alto contraste y texto
  grande (persistidos en el dispositivo).
- Pruebas automáticas con axe-core en los componentes clave; el contraste se garantiza por
  tokens (la tabla de la propuesta de diseño de BIG1).

## 8. Seguridad

- `helmet`, CORS restringido por `CORS_ORIGINS`, cuerpo JSON limitado a 100 kB, sin
  `x-powered-by`, errores 500 sin detalles internos.
- Secretos solo en `.env` (ignorado por git); se versiona `.env.example`.
- **Riesgo abierto:** el MVP no tiene autenticación y está pensado para correr solo en la
  red local del local (`HOST=127.0.0.1` por defecto). Antes de exponerlo fuera de esa red,
  la Fase 2 debe agregar autenticación por dispositivo para las rutas internas
  (`/menu` seguirá siendo pública).

## 9. Hoja de ruta por fases

1. **Fase 1 (esta entrega):** arquitectura, modelo de datos, contrato OpenAPI, entorno,
   tokens, componentes base y lecturas (`GET`) funcionando con datos de ejemplo.
2. **Fase 2 · Backend:** `POST /orders`, `PATCH /orders/{id}/status` con publicación SSE,
   CRUD de productos (P01) y autenticación por dispositivo. En la UI se conectan
   `ComandaPanel.onSubmit` y `KitchenBoard.onAdvance` (hoy se muestran sin acción).
3. **Fase 3 · Frontend:** mutaciones optimistas, administración del catálogo, QR por mesa.
4. **Fase 4 · QA:** pruebas P01–P13, TalkBack/VoiceOver, pruebas en horario real.
