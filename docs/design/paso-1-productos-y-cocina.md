# Paso 1: productos (buscar, filtrar, agotar) y sonido en Cocina

Aprobado con las decisiones propuestas (agotado hoy, sonido apagado por defecto, sin selección múltiple) e implementado.
Los contadores en la navegación ya salieron en el paso V (mesas por cobrar y pedidos nuevos).

## A. Productos: buscar, filtrar y agotar

### Qué hay hoy

- La lista agrupa por categoría y solo permite **Editar** o **Eliminar** (archivar).
- `isAvailable` ya existe: con `false` el producto sale de la carta pública y en Pedido aparece
  «Agotado» sin poder pedirse. Para cambiarlo hay que abrir el editor completo.
- El evento realtime `catalog.updated` ya refresca carta y Pedido.

### Propuesta

| Pieza           | Comportamiento                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Buscador**    | Por nombre, sin distinguir mayúsculas ni tildes. Reutiliza `search-products.ts` (se mueve a `lib/` para compartirlo con Pedido). |
| **Filtros**     | Chips: categoría, y estado (Todos · Disponibles · Agotados · En promoción). Contador «N de M» anunciado a lectores de pantalla.  |
| **Agotado hoy** | Interruptor en cada fila (48 px), sin abrir el editor. Actualiza al instante y muestra un aviso con **«Deshacer» 8 s**.          |
| **Eliminar**    | Sin cambios (archivar con confirmación).                                                                                         |

**Decisión de lenguaje:** «ocultar» se llama **«Agotado hoy»**, porque eso es lo que hace
`isAvailable`: sale de la carta y no se puede pedir. No se agrega un tercer estado.

### API

`PATCH /api/v1/admin/products/:id/availability` con `{ "isAvailable": boolean }`.

- 200 con el `AdminProduct`; 401 sin sesión de administración; 404 si no existe; 409 si está archivado.
- Emite `catalog.updated` (las tablets de Pedido y la carta se actualizan solas).
- Un endpoint propio evita enviar el formulario completo (con tamaños, reglas e imágenes) solo para
  cambiar un interruptor, y evita pisar ediciones simultáneas.
- Se documenta en `openapi.yaml`.

### Estructura

- `shared`: `ProductAvailabilityInputSchema`.
- `api`: caso de uso `setProductAvailability` en `products.service` + método del repositorio.
- `web`: `product-filter.ts` (función pura, con pruebas), `ProductFilters`, `AvailabilityToggle`,
  `useSetProductAvailability` (optimista, con rollback si falla) y el aviso con «Deshacer».

## B. Sonido en Cocina

### Propuesta

- Un **timbre corto de dos tonos** cuando entra un pedido nuevo, generado con Web Audio: sin
  archivos de audio y sin dependencias.
- **Interruptor «Sonido»** en el encabezado de Cocina (ícono + texto, `aria-pressed`). Empieza
  **apagado** y se recuerda **por dispositivo** (localStorage): la tablet de cocina lo deja
  encendido. Al encenderlo se reproduce una muestra; el navegador exige ese gesto para permitir audio.
- Suena **una vez por tanda** de pedidos nuevos, nunca al cargar la página, al reconectar ni en
  reimpresiones: se comparan los ids ya vistos.
- Aviso **no sonoro** en paralelo, para quien no oye o tiene el sonido apagado: el título de la
  pestaña muestra «(2) Cocina», y la región `aria-live` anuncia «Nuevo pedido: Mesa 2».

### Estructura

- `chime-player.ts`: puerto `ChimePlayer` con el adaptador Web Audio (se inyecta en las pruebas).
- `new-order-detector.ts`: función pura que devuelve los pedidos nuevos respecto de los ya vistos.
- `useNewOrderChime`: junta ambos con la preferencia guardada.

### Riesgos

- Si la tablet se apaga o la pestaña queda en segundo plano, el navegador puede silenciar el
  sonido. Mitigación: documentar «mantén la pantalla encendida» en el README; el Wake Lock queda
  como mejora posterior.
- Los navegadores pueden suspender el audio tras mucho tiempo sin interacción: el timbre vuelve a
  intentar reanudar el contexto antes de sonar.

## Pruebas

- `shared` y `api`: esquema; endpoint (200, 401, 404, 409, evento emitido).
- `web`: filtros puros; la lista (buscar, filtrar, agotar, «Deshacer», error con rollback);
  detector de pedidos nuevos; interruptor de sonido (persistencia, muestra al encenderlo, no suena
  al cargar); accesibilidad con axe.

## Decisiones que necesito de ti

1. ¿«Ocultar» = **«Agotado hoy»** (reutilizando `isAvailable`), como propongo?
2. ¿Sonido **apagado por defecto** y recordado por dispositivo?
3. ¿Quieres también **agotar varios a la vez** (selección múltiple)? Lo dejo fuera de esta entrega.
