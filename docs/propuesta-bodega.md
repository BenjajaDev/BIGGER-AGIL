# Propuesta: Bodega pensada para el uso diario

## Problema

La pantalla actual muestra cada insumo con cinco botones del mismo peso (Entrada, Merma, Contar, Editar
y Eliminar), usa palabras técnicas, escribe fechas como `2026-11-13` y abre formularios en medio de la
lista. Para alguien con las manos ocupadas, que registra mercadería varias veces al día, son demasiadas
decisiones para una tarea que debería tomar dos toques.

## Principios

1. **Lo frecuente en dos toques**: tocar el insumo, escribir la cantidad y guardar.
2. **Lo urgente primero**: los insumos vencidos, sin stock, bajo el mínimo o por vencer encabezan la
   lista y tienen filtros con contador.
3. **Palabras de cocina**: «Llegó», «Se perdió», «Contar»; fechas relativas («vence mañana», «venció
   hace 13 días»).
4. **Lo ocasional, guardado pero a mano**: editar, eliminar, proveedores y recetas no compiten con el
   registro diario.
5. **Errores reversibles**: cada registro se puede deshacer durante unos segundos.

## Pantallas

### Inventario

- Buscador «Buscar insumo» y filtros con contador: **Todos**, **Por reponer** (bajo el mínimo o sin
  stock), **Por vencer** y **Vencidos**.
- Cada insumo es **una sola fila tocable** (≥ 72 px), sin botones:
  - franja e ícono del estado a la izquierda;
  - nombre y proveedor;
  - stock grande con su unidad («4 kg»), barra de nivel y «mín. 3 kg»;
  - estado en palabras: «Vence mañana», «Venció hace 13 días», «Faltan 2,5 kg para el mínimo», «Sin
    stock».
- Orden: urgentes primero y después alfabético.
- Acción de la página: **«Registrar llegada»**, que abre el registro con un buscador de insumo, para cuando
  llega un pedido completo. «Nuevo insumo» queda como acción secundaria.

### Ficha del insumo (panel)

Se abre desde abajo en el celular y desde la derecha en PC; la lista sigue visible detrás.

- Encabezado: nombre, stock actual grande y estado.
- Selector de tres opciones: **Llegó** (+), **Se perdió** (−) y **Contar** (dejar el stock exacto).
- Cantidad con teclado numérico, botones − / + y atajos según la unidad (+1, +5, +10 unidades; +0,5 o
  +1 kg). Debajo: **«Quedará: 9 kg»**.
- Llegó: fecha de vencimiento opcional con atajos (sin vencimiento, 3 días, 7 días, 30 días, otra fecha).
- Se perdió: motivo con atajos (venció, se echó a perder, se cayó o rompió, otro).
- Botón principal a lo ancho: **«Guardar llegada · +5 kg»**.
- Al guardar: aviso «Se registró +5 kg de Palta» con **Deshacer** (vuelve al stock anterior con un
  conteo).
- «Últimos movimientos» del insumo (5), con fecha relativa y quién lo originó (venta, llegada,
  pérdida o conteo).
- «Más opciones»: Editar insumo y Eliminar (con confirmación).

### Nuevo o editar insumo (panel)

Nombre, unidad con botones (kg, g, L, ml, unidades), stock mínimo, costo por unidad, proveedor y
vencimiento. Al crear: **«Stock inicial»** opcional, que se registra como conteo.

### Por comprar

Una tarjeta por proveedor con lo que falta y lo sugerido, total estimado, «Enviar por WhatsApp» y
«Copiar». Cada insumo tiene **«Llegó»**, que abre la ficha con la cantidad sugerida ya escrita.

### Proveedores y recetas

Mismo patrón: filas tocables y edición en el panel.

## Técnica

- Componente compartido `Sheet` (diálogo nativo): hoja inferior en el celular y panel lateral en PC, con
  foco atrapado, Esc para cerrar y movimiento que respeta `prefers-reduced-motion`.
- La API acepta `GET /inventory/movements?supplyId=` para el historial de un insumo.
- Se mantienen las reglas de stock y alertas del dominio compartido (`supplyAlert`).
