# Plan de mejora visual · BIGGER Ágil (UX/UI)

Objetivo: que todo el sistema se sienta como un solo producto, cómodo en tablet, PC y celular, e
integrar los módulos nuevos (Reportes, Bodega, QR, Carta braille) al mismo lenguaje visual y al
Resumen del día.

## Diagnóstico (auditoría de las 26 pantallas)

1. **Sin primitivas de página.** 20 archivos redefinen su `.title`, 8 su `.header`, 8 su `.page` y 13
   su `.card`. Por eso unas pantallas se centran (Resumen, QR, Braille) y otras se pegan a la
   izquierda (Mesas, Cuenta, Pedido, Bodega, Reportes, Configuración).
2. **Pestañas sin semántica.** Bodega y Reportes cambian de sección con `Chip` + `role="group"`; no hay
   `tablist`/`tab`, ni flechas de teclado.
3. **Acciones destructivas inconsistentes.** «Eliminar» aparece como texto, con ícono o como ícono solo
   según la pantalla; Bodega elimina sin confirmar; QR usa `window.confirm`.
4. **Formularios a mano.** Bodega, Reportes, Caja y Pedido usan `<input>` sin `Field`.
5. **Reportes desborda en el celular** (la página queda más ancha que la pantalla).
6. **El Resumen no muestra los módulos nuevos**: el encargado no ve ventas del día ni alertas de bodega
   sin entrar a Gestión.
7. **Títulos de pestaña del navegador** solo en Cocina.
8. **Pedido**: las tarjetas de producto son texto plano y no muestran cuántas unidades ya hay en la
   comanda.

## Decisiones

### Base (sistema de diseño)

- Tokens nuevos: `--text-page-title` (28 px), `--text-section` (18 px), `--page-gutter` (24 px; 16 px
  en celular), `--content-narrow` (52 rem), escala `--z-*` (sticky, barra, diálogo, aviso) y
  `--shadow-overlay`.
- `Page` (`components/layout/Page.tsx`): contenedor único de página, `width="wide" | "narrow" | "full"`,
  centrado, con el mismo margen en todas las pantallas.
- `PageHeader`: título (h1), subtítulo, enlace «volver», acciones a la derecha (abajo y a lo ancho
  en el celular) y título de la pestaña del navegador («Mesas · BIGGER»).
- `SectionHeader`: h2 + descripción + acciones, para los bloques dentro de una página.
- `Tabs`: `tablist` accesible (flechas, Inicio/Fin, foco itinerante), deslizable en el celular, con
  ícono y contador opcional.
- `StatCard`: tarjeta de indicador (ícono, etiqueta, valor, variación con color y flecha, enlace
  opcional). La usan Reportes y el Resumen.
- `Skeleton`: bloques de carga con forma; `AsyncContent` acepta `skeleton` en vez del spinner.
- `Button`: variante `danger` (texto rojo oscuro, para Eliminar/Anular) y `iconOnly` (48 × 48 con
  `aria-label` obligatorio).

### Reglas para todas las pantallas

- Toda página usa `Page` + `PageHeader`. Nada de `.title`/`.page` propios.
- Eliminar/Anular: siempre `variant="danger"` con ícono `Trash2`, y siempre con `ConfirmDialog`.
- Editar: `variant="secondary"` con ícono `Pencil`. Los íconos solos solo donde hay muchas filas
  (Bodega), con `aria-label`.
- Formularios con `Field`, `MoneyInput` y `control`.
- Sin colores crudos; táctil ≥ 48 px; contraste AA; foco visible; movimiento con tokens.

### Por área

- **Resumen**: con sesión de encargado, una fila «Hoy en caja» (ventas, pedidos, ticket promedio con
  `StatCard`, enlazados a Reportes) y, en «Ahora», las alertas de Bodega (stock bajo y por vencer).
  Sin sesión no se muestra nada de esto.
- **Mesas / Cuenta / Pedido / Cocina**: `Page` + `PageHeader`. En Pedido, tarjetas de producto con
  ícono de su categoría, precio destacado y contador de unidades ya agregadas.
- **Reportes**: sin desborde en el celular; KPI con `StatCard`; períodos con `Tabs`; fechas con `Field`.
- **Bodega**: `Tabs` con contador de alertas en Inventario; su propio CSS; confirmación al eliminar;
  formularios con `Field`; acciones de fila compactas en el celular.
- **Configuración**: listas de Productos, Combos, Tipos, Personalizaciones y Categorías con el mismo
  patrón de fila y acciones; estados vacíos con `EmptyState` y botón; QR regenera con `ConfirmDialog`.
- **Carta pública**: sin cambios de estructura (ya fue rediseñada).
