# Cuentas, pagos y pedidos compartidos por mesa

Estado: **aprobado** · Fase 2 (backend) implementada · Fase 3 (interfaz) pendiente.

## 1. Objetivo

1. Registrar pagos con **efectivo**, **débito** o **JUNAEB**.
2. Dividir una cuenta **por productos** (una persona paga solo su café) o **en partes iguales**
   (la cuenta se divide en 2).
3. Que varias personas sumen pedidos a una **misma mesa activa**, aunque ya haya pagos
   parciales.
4. Pulir la vista de Cocina (alineación de columnas y tickets).

Decisiones ya tomadas con BIGGER:

- Propina **sugerida del 10 %**, opcional y editable; se registra aparte del consumo.
- En efectivo se ingresa el **monto recibido** y el sistema calcula el **vuelto**.
- Se puede **cobrar en cualquier momento**; la mesa se libera cuando todo está **pagado y
  entregado**.

## 2. Concepto nuevo: la cuenta (`check`)

Hoy una mesa solo agrupa pedidos de forma implícita. Para dividir pagos entre varios pedidos
hace falta una entidad explícita: **la cuenta de la mesa**.

- Una mesa tiene **como máximo una cuenta abierta**. El primer pedido la abre; los pedidos
  siguientes (otra persona que llega) se suman a la misma cuenta.
- Un pedido para llevar o por WhatsApp tiene **su propia cuenta**.
- Los pagos se registran contra la cuenta, no contra un pedido: así «la persona 2 paga su
  café» funciona aunque el café esté en el pedido de otra persona.
- La cuenta se **cierra** cuando el saldo es 0 y todos sus pedidos están entregados (o
  anulados). Al cerrarse, sus pedidos pasan a `paid` y la mesa queda libre.

```mermaid
erDiagram
  dining_tables ||--o{ checks : "cuentas"
  checks ||--|{ orders : agrupa
  checks ||--o{ payments : "pagos"
  payments ||--o{ payment_items : "por productos"
  order_items ||--o{ payment_items : "unidades pagadas"

  checks { text id PK; text table_id FK "null en para llevar"; text status "open | closed"; int split_parts "null = sin división"; ts opened_at; ts closed_at }
  orders { text check_id FK "nuevo, obligatorio" }
  payments { text id PK; text check_id FK; text method "cash | debit | junaeb"; text mode "full | items | equal"; int amount_clp; int tip_clp; int received_clp "solo efectivo"; ts voided_at; text void_reason; ts created_at }
  payment_items { text payment_id PK; text order_item_id PK; int quantity; int amount_clp }
```

- Índice único parcial: una sola cuenta `open` por `table_id`.
- Montos en CLP enteros, como el resto del sistema.
- `payment_items` guarda **cuántas unidades** de cada línea se pagaron (2 de 3 cafés) y el
  monto con sus extras, para que nadie pague dos veces el mismo producto.
- Los pagos no se borran: se **anulan** (`voided_at` + motivo) para dejar rastro en Reportes.

**Migración (`0004`):** crea las tablas y una cuenta por cada grupo existente: una abierta por
mesa con pedidos abiertos y una cerrada por cada pedido histórico. Así `orders.check_id`
queda `NOT NULL` desde el inicio.

## 3. Reglas de negocio (en `packages/shared`, usadas por API y UI)

| Regla                      | Detalle                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total de la cuenta         | Suma de sus pedidos no anulados.                                                                                                                                                                                                              |
| Saldo                      | Total − pagos vigentes (sin propina). Nunca negativo: un pago no puede superar el saldo.                                                                                                                                                      |
| Pago **completo**          | Paga todo el saldo.                                                                                                                                                                                                                           |
| Pago **por productos**     | Se eligen unidades no pagadas (`orderItemId` + cantidad). **El servidor** calcula el monto: (precio base + extras) × unidades.                                                                                                                |
| Pago **en partes iguales** | Se define `split_parts` (2–20) en la cuenta. Cada parte = saldo ÷ partes restantes; el resto de la división va a la última parte (nada se pierde por redondeo). Si se agregan pedidos, las partes restantes se recalculan con el saldo nuevo. |
| Propina                    | Sugerida: 10 % del monto del pago, redondeado a $10. Editable o 0. **No se acepta con JUNAEB** (supuesto, ver §7).                                                                                                                            |
| Efectivo                   | `received_clp` ≥ monto + propina; vuelto = recibido − (monto + propina).                                                                                                                                                                      |
| Pedidos nuevos             | Se pueden agregar mientras la cuenta esté abierta, aunque haya pagos parciales.                                                                                                                                                               |
| Anular un pedido           | Rechazado (409) si deja lo pagado por encima del nuevo total o si tiene unidades pagadas por producto: primero se anula el pago.                                                                                                              |
| Anular un pago             | Solo en cuentas abiertas; exige motivo.                                                                                                                                                                                                       |
| Cierre                     | Saldo 0 y todos los pedidos entregados o anulados → cuenta `closed`, pedidos `paid`, mesa libre. Si se paga antes de entregar, se cierra sola al marcar el último pedido como entregado.                                                      |

**Estado de la mesa (derivado, como hoy):**

- `free`: sin cuenta abierta.
- `occupied`: hay pedidos sin entregar.
- `awaiting-payment`: todo entregado y saldo > 0.

## 4. Contrato de API (resumen; detalle en `openapi.yaml` en la Fase 2)

| Método | Ruta                    | Qué hace                                                                                                       |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/tables/{id}/check`    | Cuenta abierta de la mesa: pedidos, pagos, total, pagado, saldo, unidades pendientes por línea. 404 si no hay. |
| `GET`  | `/checks/{id}`          | Lo mismo por id (para llevar / WhatsApp).                                                                      |
| `PUT`  | `/checks/{id}/split`    | `{ parts: 2..20 \| null }` define o quita la división en partes iguales.                                       |
| `POST` | `/checks/{id}/payments` | Registra un pago (ver abajo). Responde la cuenta actualizada.                                                  |
| `POST` | `/payments/{id}/void`   | `{ reason }` anula un pago.                                                                                    |
| `POST` | `/orders`               | Sin cambios en la entrada; un pedido en mesa se suma a la cuenta abierta o abre una nueva.                     |
| `GET`  | `/tables`               | `TableOverview` suma `checkId`, `paidClp` y `balanceClp`.                                                      |

```jsonc
// POST /checks/{id}/payments
{
  "method": "cash", // cash | debit | junaeb
  "mode": "items", // full | items | equal
  "items": [{ "orderItemId": "…", "quantity": 1 }], // solo en items
  "tipClp": 270,
  "receivedClp": 5000, // solo en efectivo
  "expectedAmountClp": 2700, // el monto que vio quien cobra; si cambió → 409
}
```

Errores: `VALIDATION_ERROR` (unidades ya pagadas, recibido insuficiente, propina con JUNAEB),
`CONFLICT` (cuenta cerrada o el saldo cambió mientras se cobraba), `NOT_FOUND`.

Tiempo real: nuevo evento SSE `check.updated`; las tablets de Mesas y Cobro se refrescan solas.

## 5. Estructura de carpetas

```
packages/shared/src/domain/
  checks.ts            Esquemas (Check, Payment, inputs) y reglas puras:
  checks.test.ts         saldo, unidades pendientes, partes iguales, propina, vuelto
apps/api/src/modules/checks/
  checks.repository.ts   (patrón repositorio, SQLite/Drizzle)
  checks.service.ts      reglas de cobro, cierre y eventos
  checks.controller.ts / checks.routes.ts
apps/api/drizzle/0004_checks_and_payments.sql
apps/web/src/features/checks/
  TableCheckPage.tsx     /mesas/:tableId — cuenta de la mesa
  components/            PaymentDialog, SplitSelector, ItemPicker, CashChange, TipField
  useCheck.ts            queries y mutaciones
  payment-draft.ts       estado del cobro (puro, con tests)
```

## 6. Interfaz (Fase 3)

**Mesas → mesa ocupada** abre la **cuenta de la mesa** (`/mesas/:id`) en lugar de ir directo a
Pedido:

- Pedidos de la mesa, cada uno con su estado de cocina y nombre opcional («Juan»), y las
  unidades ya pagadas marcadas.
- Resumen: total · pagado · **saldo** (en grande).
- Acciones: **Agregar pedido** (abre Pedido para la misma mesa, con campo «¿Para quién?»
  opcional) y **Cobrar** (botón primario).

**Cobrar** (diálogo, pensado para tablet):

1. ¿Qué se paga? **Todo** · **Por productos** (lista con selector de unidades) · **Partes
   iguales** (2, 3, 4… y muestra «Parte 1 de 2: $5.450»).
2. Medio de pago: tres botones grandes con ícono y texto (Efectivo, Débito, JUNAEB).
3. Propina 10 % sugerida (interruptor + monto editable; deshabilitada con JUNAEB y explicando
   por qué).
4. Efectivo: monto recibido con atajos ($5.000, $10.000, $20.000, exacto) y **vuelto** en
   grande.
5. Confirmar → comprobante en pantalla y la cuenta se actualiza en todas las tablets.

**Para llevar / WhatsApp:** botón **Cobrar** en la tarjeta del pedido (mismo diálogo).

**Cocina:** auditoría visual en PC y tablet (columnas de igual ancho, encabezados y tickets
alineados a la misma grilla, tiempos y acciones en posiciones fijas, sin saltos al arrastrar).
No cambia el flujo.

## 7. Supuestos a confirmar

1. **JUNAEB no admite propina** (la beca solo cubre alimentos): si alguien paga con JUNAEB y
   quiere dejar propina, se registra como un pago aparte en efectivo o débito.
2. No hay **crédito** ni **transferencia** por ahora; agregarlos después es sumar un valor al
   enum.
3. El débito se registra manualmente (no hay integración con el POS/Transbank).
4. Anular pagos queda disponible para cualquier tablet (aún no hay usuarios por dispositivo);
   queda registrado con motivo y hora.

## 8. Fases

1. **Diseño** (este documento) → aprobación.
2. **Backend:** migración, `packages/shared/domain/checks.ts`, módulo `checks`, pedidos que se
   suman a la cuenta, cierre automático, SSE y OpenAPI, con tests unitarios e integración.
3. **Frontend:** cuenta de la mesa, diálogo de cobro, cobro de para llevar y pulido de Cocina.
4. **QA:** pruebas de UI y accesibilidad (axe), verificación visual en PC, tablet y celular,
   documentación.
