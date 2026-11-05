# Impresión de comandas, sistema visual y mejoras del panel de administración

Estado: **propuesta (Fase 1)** · pendiente de aprobación.

## 1. Impresión de comandas en térmica de 58 mm (opción A)

La API corre en un equipo del local, la impresora se empareja con ese equipo y la API le
escribe ESC/POS. Así imprime sola, sin navegador abierto, y una tablet apagada no pierde
comandas.

### Supuestos (se confirman con la hoja de autodiagnóstico de la impresora)

- **OCPP-M13:** no hay ficha oficial; un listado la describe como Bluetooth. Se asume ESC/POS
  y ~48 mm imprimibles (32 columnas con fuente A). No se asume que traiga cortador: se
  avanzan líneas de papel al final.
- **Conexión:** Bluetooth clásico emparejado con el equipo del local, que lo expone como
  puerto serie (`COMx` en Windows, `/dev/rfcomm0` en Linux). Si resulta ser solo USB, se agrega
  otro adaptador sin tocar el resto.

### Arquitectura

```
orders.service ──order.created──▶ PrintQueue ──▶ ReceiptPrinter (puerto)
                                      │              ├─ SerialPrinter   (COM / rfcomm)  ← inicial
                                      │              ├─ FilePrinter     (desarrollo y tests)
                                      ▼              └─ UsbPrinter / TcpPrinter (si hiciera falta)
                                 print_jobs (SQLite)
```

- `packages/shared/src/domain/receipts.ts`: funciones puras que convierten un pedido (o una
  mesa) en líneas de ticket; testeables sin impresora.
- `apps/api/src/modules/printing/`: `escpos-encoder.ts` (bytes), `receipt-printer.ts` (puerto),
  adaptadores, `print-queue.service.ts`, repositorio, controlador y rutas.
- **Cola persistente** (`print_jobs`: `kind`, `ref_id`, `copy`, `status` pendiente | imprimiendo |
  impreso | fallido, `attempts`, `last_error`): un solo trabajo a la vez (la impresora es un
  puerto serie), 3 reintentos con espera creciente, y al reiniciar la API retoma lo pendiente.
- **Un fallo de impresión nunca bloquea el pedido**: el pedido se guarda y se anuncia igual; el
  trabajo queda `fallido` y visible.
- **Reimpresión:** crea un trabajo nuevo (`copy` + 1) con la marca «REIMPRESIÓN».
- **Configuración por variables de entorno validadas con zod:** `PRINTER_ENABLED`,
  `PRINTER_TRANSPORT` (`serial` | `file`), `PRINTER_PATH`, `PRINTER_CHARSET` (`cp858` | `ascii`),
  `PRINTER_COLUMNS` (32).
- **Acentos y ñ:** se envía la tabla de caracteres con `ESC t`; si la impresora no la soporta,
  `PRINTER_CHARSET=ascii` translitera (á → a).

### Ticket de cocina (58 mm, 32 columnas, sin precios)

```
          BIGGER
================================
MESA 2          Pedido 3  14:32
Para: Ana
--------------------------------
2 x CHACARERO
     sin tomate
1 x ARMA TU ENSALADA (Grande)
     Proteína: Pollo
     Vegetales: Apio, Choclo,
       Pepino, Tomate
     NOTA: sin sal
--------------------------------
        * * *  *  * *
```

Mesa y producto en doble alto; extras y notas con sangría. Para llevar y WhatsApp muestran el
nombre y la hora de retiro.

### Qué se imprime y cuándo (a confirmar)

| Ticket                | Cuándo                      | Por defecto      |
| --------------------- | --------------------------- | ---------------- |
| Comanda de cocina     | Al crear el pedido          | Sí               |
| Pre-cuenta de la mesa | Al tocar «Imprimir cuenta»  | Sí, bajo demanda |
| Comprobante de pago   | Al cobrar                   | No               |
| QR de la mesa         | Desde Mesas → Configuración | Bajo demanda     |

### Interfaz

- Indicador «Impresora» en la barra superior (lista / con problema / apagada) y contador de
  trabajos fallidos.
- Botón **Reimprimir** en cada pedido de Cocina y en la cuenta de la mesa.
- **Configuración → Impresora**: estado, «Imprimir prueba» (acentos, ñ, QR y línea de 32
  caracteres para verificar el ancho) y lista de trabajos recientes.

### API (resumen)

| Método | Ruta                  | Qué hace                                      |
| ------ | --------------------- | --------------------------------------------- |
| `GET`  | `/printer`            | Estado y configuración vigente (sin secretos) |
| `POST` | `/printer/test`       | Imprime la hoja de prueba                     |
| `POST` | `/orders/{id}/print`  | Reimprime la comanda                          |
| `POST` | `/checks/{id}/print`  | Imprime la pre-cuenta                         |
| `GET`  | `/print-jobs?status=` | Trabajos recientes                            |

Las rutas de impresión van detrás de la misma protección que el resto de las internas.

### Pruebas

Unitarias del encoder (bytes exactos), del formato (ancho nunca mayor a 32, saltos de línea
con sangría, mayúsculas y acentos) y de la cola (reintentos, reinicio, un fallo no frena la
siguiente). Integración HTTP con `FilePrinter`. **La prueba con la impresora real la hace
BIGGER en el local**; desde la nube se valida con una vista previa en imagen.

## 2. Sistema visual y estructura del panel (de `propuesta-visual`)

La rama `feat/propuesta-visual` de `pollo-broasters-maule` (tuya) contiene el admin ya
rediseñado y un sistema de diseño verificado. Se porta **el sistema** (arquitectura de tokens,
piezas y reglas de calidad), sin dependencias nuevas. **La distribución de las pantallas es
propia de BIGGER**: no se copia la de ese panel.

### Qué se porta

| Pieza                                           | Dónde está allá                                                                                    | Cómo queda en BIGGER                                                                                                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Configuración de navegación**                 | `menuAdmin.ts`                                                                                     | Una sola fuente de rutas, grupos y contadores que alimenta la barra superior, la inferior y la hoja «Más»                                                                                                                             |
| **Tokens en 3 capas**                           | `estilos/tokens.css`                                                                               | Escalas OKLCH → semánticos (`fondo`, `superficie`, `tinta`, `acento`, `linea`) → pares `accion/accion-tinta`, `marca/marca-tinta`, `boleta` y estados `exito/aviso/peligro/info` con su tono suave. Cada par con su contraste anotado |
| **Tamaños táctiles**                            | `--tactil-min/comodo/grande`                                                                       | 48 / 56 / 64 px (acción principal) y texto mínimo de 13 px                                                                                                                                                                            |
| **Movimiento**                                  | `--dur-*`, `--ease-*`, `vt-contenido`                                                              | Duraciones y curvas como tokens; View Transitions entre secciones (`viewTransition` en `NavLink`); la tarjeta de Cocina viaja a su columna; `prefers-reduced-motion` e interruptor «Menos animaciones»                                |
| **Piezas del admin**                            | `ui/Cifra`, `Pastilla`, `Segmentado`, `Interruptor`, `TablaAdaptable`, `BarraPagina`, `PildoraNav` | Cifras que nunca se parten (versión corta por container query), tonos con tinta AA (amarillo, naranja, verde, petróleo, crítico, neutro), tabla en PC que pasa a tarjetas en celular                                                  |
| **Piezas táctiles**                             | `ChipsSeleccion`, `Stepper`, `MontosRapidos`, `TarjetaOpcion`, `ChequeoAnimado`, `useCifraAnimada` | Reemplazan escribir: notas rápidas en Pedido, cantidades, montos de efectivo (sustituye a los atajos actuales de Cobrar), tipo de pedido. Toast con **«Deshacer» 8 s** en vez de confirmar acciones reversibles                       |
| **Gráficos sin librería**                       | `graficos/GraficoBarras`, `BarrasHorizontales`, `GraficoDona`, `TablaDatos`                        | Para Reportes, cada gráfico con su tabla equivalente para lector de pantalla                                                                                                                                                          |
| **Comanda troquelada**                          | `.adm-comanda`                                                                                     | Tarjetas de Cocina con borde de papel recortado y, en Configuración → Impresora, **vista previa del ticket térmico** tal como saldrá impreso                                                                                          |
| **«Requiere atención ahora»** y **cifra héroe** | `FranjaAtencion`, `.adm-sol`, `TarjetaKpi`                                                         | Pendientes con acción a un toque en Mesas y ventas del día destacadas                                                                                                                                                                 |
| **Calidad**                                     | `scripts/check-tokens.mjs`, `estilos/contraste.test.ts`, `/demo/ui`                                | Script que prohíbe colores crudos en pantallas, test que calcula el contraste AA **desde** `tokens.css` y un banco de componentes para revisar estados                                                                                |

### Distribución propia de BIGGER (distinta a la de ese panel)

Se mantiene la barra oscura que BIGGER ya tiene y se ordena por **jerarquía de trabajo**, no
por módulos:

- **Navegación en dos niveles (PC y tablet):** barra oscura con interruptor **Operación /
  Gestión** y debajo las pestañas del grupo (Resumen, Mesas, Pedido, Cocina, Avisos) con su
  contador. Gestión agrupa Carta, Promociones, Bodega, Reportes, Clientes y Ajustes. No hay riel
  lateral ni encabezado de color.
- **Celular:** barra inferior con **acción central «+ Pedido»** entre Mesas · Cocina y Avisos ·
  Más. Lo urgente va primero.
- **Resumen de hoy, de izquierda a derecha:**
  - Columna principal: **Mesas** (con filtro Todas / Ocupadas / Por cobrar) y **Cocina en vivo**
    (nuevos, en preparación y listos con el tiempo del más antiguo).
  - Columna lateral: **Ahora** (lista de pendientes con una acción a un toque), **Hoy** (ventas,
    ganancia, ticket y pedidos con las ventas de la semana) y la **última comanda impresa** con
    «Reimprimir».
  - Sin tarjeta héroe: las ventas son una fila más del bloque Hoy.
  - En tablet y celular **Ahora** sube al principio.
- **Acciones de la página:** «Cierre de caja» y «+ Nuevo pedido» arriba a la derecha.

### Qué no se porta

- **Gallito, vuelo al carrito, mantel animado y platos redondos:** son la identidad de Pollo
  Broaster's y de su app de clientes.
- **Tema oscuro del cliente y «modo demostración»** (escenarios y datos en el navegador).
- **Riel lateral, encabezado amarillo y tela de cuadros:** son la distribución y la identidad
  de ese panel.

### Paleta y tipografía: se mantienen las de BIGGER

**Decidido:** la paleta actual de BIGGER (carbón, crema, terracota, rojo, dorado, salvia) y su
tipografía no cambian. Los tokens nuevos se construyen **sobre esos mismos valores**: se
ordenan en capas y se les mide el contraste, sin tocar ningún color.

## 3. Mejoras funcionales del panel admin, a partir de `pollo-broasters-maule`

Se revisó la rama `develop` de ese repo. Las nueve secciones de su admin están completas
(sin pendientes ni «próximamente»). Aquí se toma **la lógica de negocio**; la forma de las
pantallas sale del sistema visual de la sección 2.

### Qué se adapta y qué no

| Habilitado allá                                                                                | Aquí                               | Adaptación                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Panel con «requiere atención ahora» y KPIs                                                     | **Resumen de hoy**                 | Contadores en la navegación y franja de pendientes con ventas del día; ver sección 2                                                |
| Reportes con rango, agrupar, KPIs, categorías, método, más vendidos y CSV                      | **Reportes**                       | Se calcula desde `payments` (propinas aparte, pagos anulados excluidos, medios efectivo/débito/JUNAEB) y se suma **cierre de caja** |
| Exportar CSV seguro                                                                            | Igual                              | BOM para Excel y escape de fórmulas (`=`, `+`, `-`, `@`)                                                                            |
| Inventario: insumos, mínimo, costo, movimientos, mermas                                        | **Bodega**                         | Igual de simple, más recetas por **tamaño y por opción** (la ensalada Grande consume 4 vegetales; la Pequeña, 3)                    |
| Niveles de stock ok / bajo / crítico y orden por urgencia                                      | Igual                              | Crítico bajo el 80 % del mínimo                                                                                                     |
| Descuento automático por venta, nunca bajo 0                                                   | Igual                              | Se descuenta al pasar a «En preparación» y se devuelve si se anula                                                                  |
| Costo por pedido → ganancia y margen                                                           | **Ganancia**                       | El costo sale de la receta × costo del insumo y se congela en cada línea del pedido                                                 |
| Mesas: alta, capacidad, reservada, QR por mesa                                                 | **Mesas (admin)**                  | QR con **token no adivinable** por mesa (allá es secuencial) y QR imprimible en la térmica                                          |
| Avisos: llamar mesero / pedir cuenta, en camino, resuelto, anti-doble envío                    | **Avisos de mesa**                 | Solo si se acepta que la carta del QR tenga esos dos botones (ver §3)                                                               |
| Promociones: % , monto fijo por unidad, combo N por $X, alcance producto o categoría, vigencia | **Promociones con descuento real** | Hoy BIGGER solo «destaca»; el servidor aplicaría la mejor por línea (no se acumulan) y congelaría el descuento                      |
| Carta admin: buscar, filtrar por categoría, ocultar sin eliminar                               | **Productos**                      | Búsqueda y filtro en la lista; «Ocultar en carta» (sigue disponible en Pedido)                                                      |
| Pedidos en vivo con historial de estados                                                       | **Tiempos**                        | Se registran las horas de cada estado y Reportes muestra el tiempo medio de preparación                                             |
| Sonido de aviso                                                                                | **Cocina**                         | Sonido al entrar un pedido, con silenciar guardado en cada dispositivo                                                              |
| Clientes y puntos (niveles, canjes, ajustes)                                                   | **Fidelización**                   | **Opcional y al final**: exige datos personales con consentimiento                                                                  |

**No se toma:** la app de clientes (registro, login, carrito), el almacenamiento en el
navegador, ni ningún pedido desde la carta (BIGGER decidió que la carta es informativa).

### Orden propuesto

| Paso | Contenido                                                                                                                                                                                                                                                                      | Depende de               | Tamaño |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------ |
| 0    | Impresión de comandas (backend y cola)                                                                                                                                                                                                                                         | —                        | Medio  |
| V    | **Sistema visual y navegación del panel**: tokens en capas con la paleta actual, barra en dos niveles y barra inferior con acción central, piezas del admin y táctiles, `check-tokens` y test de contraste. Se hace antes de las pantallas nuevas para que todas nazcan con él | —                        | Grande |
| 1    | Productos: buscar, filtrar y ocultar · contadores en la navegación · sonido en Cocina                                                                                                                                                                                          | —                        | Chico  |
| 2    | Reportes (rango, agrupar, categorías, medios de pago, más vendidos, CSV) y cierre de caja                                                                                                                                                                                      | Pagos (ya está)          | Medio  |
| 3    | Mesas admin con QR por mesa (y QR en la térmica)                                                                                                                                                                                                                               | Paso 0                   | Chico  |
| 4    | Avisos de mesa                                                                                                                                                                                                                                                                 | Paso 3 y decisión §3     | Medio  |
| 5    | Bodega: insumos, movimientos y recetas por tamaño y opción · costo y ganancia · tiempos                                                                                                                                                                                        | —                        | Grande |
| 6    | Promociones con descuento real                                                                                                                                                                                                                                                 | Paso 5 para medir margen | Medio  |
| 7    | Fidelización                                                                                                                                                                                                                                                                   | Pasos 2 y 6              | Grande |

Cada paso se entrega como Fase 2 (backend) y Fase 3 (interfaz), con tests y capturas, igual
que el cobro.

## 4. Riesgos y decisiones abiertas

1. **Avisos y la carta informativa:** «Llamar al mesero» y «Pedir la cuenta» desde el QR son
   las únicas acciones que cambiarían el carácter informativo de la carta. Son endpoints
   públicos sin sesión: llevarían límite por mesa en el servidor (un aviso igual cada 20 s),
   token de mesa no adivinable y validación estricta.
2. **Promociones y pago por productos:** un descuento por combo hay que repartirlo entre las
   unidades para que «Juan paga su parte» siga sumando exacto. Se resuelve con el mismo reparto
   de restos que las partes iguales.
3. **Descuento de stock:** si una receta pide más de lo que hay, el stock queda en 0 y se
   avisa; nunca queda negativo.
4. **Datos personales (fidelización):** nombre y teléfono con consentimiento expreso, y
   posibilidad de borrar la cuenta. Por eso va al final.
5. **Reescribir la capa visual toca todas las pantallas:** se hace por secciones, con las
   capturas de PC, tablet y celular de hoy como línea base para comparar, y sin cambiar
   textos, rutas ni lógica.
6. **Costos:** la ganancia solo es confiable si los insumos y las recetas están completos;
   Reportes mostrará «costo no definido» en vez de asumir cero.

## Estado y decisiones confirmadas (paso 0: impresión)

- **Conexión**: USB o Bluetooth, con la API corriendo en el local. Un único adaptador escribe los
  bytes ESC/POS en una ruta de dispositivo (`PRINTER_PATH`: `COM5`, `/dev/rfcomm0`,
  `/dev/usb/lp0` o `\\localhost\NOMBRE`), sin dependencias nativas.
- **Qué se imprime**: solo la comanda de cocina, al crear el pedido. Sin precios. Reimpresión
  manual desde Cocina y desde la cuenta; marca «REIMPRESIÓN» solo si ya salió una copia.
- **Robustez**: cola persistente en SQLite (`print_jobs`), un trabajo a la vez, reintentos a
  2 s / 10 s / 30 s, recuperación de trabajos interrumpidos al arrancar. Un fallo de la
  impresora nunca bloquea el pedido.
- **Descartado**: avisos «Llamar al mesero / Pedir la cuenta».
- **Pendiente**: imprimir el QR de cada mesa (paso 3) y validar en el local con la hoja de prueba.
- **Siguiente**: sistema visual y navegación (paso V), con la paleta y tipografía actuales de BIGGER.
