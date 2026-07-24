# ENTREGABLE — LENTE UX: PANTALLAS, DASHBOARDS Y CONSTRUCTOR DE GRÁFICOS
## "Stock Perfecto v2 — La Tienda de Barrio" (UPSA, taller 2h, 20 equipos, mobile-first)

> **Documento histórico anterior a la síntesis.** Incluye pantallas propuestas
> que no pertenecen al MVP. El alcance vigente está en
> [`PLAN-V2.md`](../../PLAN-V2.md).

---

## 0. SUPUESTOS DECLARADOS (ajustables por los otros lentes)

- **Capital inicial por equipo: Bs 1.000** (todos los umbrales de semáforo están calibrados a este número; si el lente de economía lo cambia, los umbrales escalan proporcionalmente).
- **Catálogo de 5 productos** de tienda de barrio (nombres y precios de ejemplo, el dataset final lo define el lente de contenido): Refresco 2L (costo Bs 8 / venta Bs 11, no vence), Leche PIL 1L (Bs 5,5 / Bs 7, vence en 2 rondas), Pan de batalla ×10 (Bs 4 / Bs 5, vence en 1 ronda), Maple de huevos (Bs 22 / Bs 28, vence en 3 rondas), Yogurt bebible (Bs 3,5 / Bs 5, vence en 2 rondas).
- **3 proveedores**: Mercado Mutualista (entrega inmediata, sin mínimo, caro), Distribuidora Don Lucho (entrega en 1 ronda, mínimo 12 unidades, −15%), Mayorista La Ramada (entrega en 1 ronda, mínimo 24 unidades, −25%).
- **1 ronda = 1 semana de la tienda.** Fase de decisión: 8 minutos por ronda.
- **Puntaje = Ganancia acumulada (Bs) + 3 × Nivel de servicio promedio (%) − Merma acumulada (Bs).**
- Dispositivo del equipo: celular Android gama media (~360×740 px lógicos), 3-5 chicos alrededor. Facilitador: laptop + proyector 1080p.
- La app corre **solo en modo claro** (aula iluminada, proyector); no se diseña dark mode para el taller.

**Principio rector de todo el diseño: "un número grande por pantalla".** 5 chicos mirando un celular a 40 cm no leen párrafos: leen UN número gigante, UN semáforo y UN botón. Todo lo demás es secundario y colapsable.

---

## 1. MAPA DE PANTALLAS DEL EQUIPO

### 1.0 Navegación global

Barra inferior fija de 5 pestañas (targets de 48px de alto, ícono + etiqueta siempre):

```
┌───────┬────────┬─────────┬───────┬───────┐
│ Inicio│ Tienda │ Pedido● │ Datos │ Podio │
└───────┴────────┴─────────┴───────┴───────┘
```

- **Inicio** = dashboard KPI. **Tienda** = catálogo + comparador de proveedores (2 sub-pestañas). **Pedido** = carrito (con badge ● naranja si la ronda está abierta y no enviaron). **Datos** = constructor de gráficos. **Podio** = ranking.
- Header global persistente en todas las pantallas: `Ronda 2/5 · ⏱ 06:32 · [estado]`. El timer cambia a naranja a los 2:00 y parpadea (+ vibración del dispositivo) a 0:30.
- El **Resultado de ronda** no es pestaña: es un takeover a pantalla completa que se dispara por Realtime cuando el facilitador publica resultados.

---

### 1.1 INICIO — Dashboard del equipo

```
┌──────────────────────────────────┐
│ LOS CUÑAPÉS TURBO      Ronda 2/5 │
│ ⏱ 06:32  · Pedidos abiertos     │
├──────────────────────────────────┤
│ ┌──────────────┐ ┌─────────────┐ │
│ │ CAJA         │ │ GANANCIA    │ │
│ │ Bs 640       │ │ Bs 118      │ │
│ │ ✓ Sana       │ │ ✓ En verde  │ │
│ └──────────────┘ └─────────────┘ │
│ ┌──────────────┐ ┌─────────────┐ │
│ │ SERVICIO     │ │ ESTANTE     │ │
│ │ 87%          │ │ Bs 312      │ │
│ │ ! Ojo        │ │ ✓ Sano      │ │
│ └──────────────┘ └─────────────┘ │
│ ┌──────────────┐ ┌─────────────┐ │
│ │ MERMA        │ │ PUNTAJE     │ │
│ │ Bs 12        │ │ 379 · #6/20 │ │
│ │ ! Ojo        │ │             │ │
│ └──────────────┘ └─────────────┘ │
├──────────────────────────────────┤
│ Semana pasada: vendieron 46 de   │
│ 53 clientes. 7 se fueron sin     │
│ comprar (faltó leche).  Ver más >│
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │      HACER PEDIDO  →         │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Inicio Tienda Pedido● Datos Podio│
└──────────────────────────────────┘
```

**Qué muestra:** los 6 KPIs (sección 3) en grilla 2×3, valor en 28px bold, semáforo como **ícono + palabra** (nunca solo color), un resumen narrado de la ronda anterior en una frase, y el CTA de fase.
**Acción principal:** botón "HACER PEDIDO" (verde, ancho completo, 56px) cuando la ronda está abierta; muta según fase ("Ver resultado", "Esperando…").
**Detalle:** tap en cualquier tile de KPI abre "Datos" con el preset de ese KPI ya cargado (el tile ES un atajo al gráfico).

---

### 1.2 TIENDA / Catálogo de productos

```
┌──────────────────────────────────┐
│ TIENDA   [Catálogo]  Proveedores │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ ▉ Refresco 2L                │ │
│ │ Vendes a Bs 11 · desde Bs 8  │ │
│ │ Ganás hasta Bs 3/u · No vence│ │
│ │ En tu estante: 4   ▁▂▅▃▆ ↗   │ │
│ │            [ + Al pedido ]   │ │
│ ├──────────────────────────────┤ │
│ │ ▉ Leche PIL 1L               │ │
│ │ Vendes a Bs 7 · desde Bs 5,5 │ │
│ │ Vence en 2 semanas ◷         │ │
│ │ En tu estante: 0 ✕  ▂▃▃▄▄    │ │
│ │            [ + Al pedido ]   │ │
│ ├──────────────────────────────┤ │
│ │ ▉ Pan de batalla ×10   ◷ 1sem│ │
│ │ ...                          │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Inicio Tienda Pedido● Datos Podio│
└──────────────────────────────────┘
```

**Qué muestra:** 1 tarjeta por producto con: cuadradito de color fijo del producto (▉, mismo color en TODA la app: catálogo, gráficos, resultado), precio de venta, costo "desde" (mejor proveedor), margen máximo por unidad en Bs, ícono de vencimiento ◷ con semanas, stock actual en estante, y un **sparkline de demanda de las últimas 5 semanas** con flecha de tendencia.
**Acción principal:** "+ Al pedido" agrega 1 línea al carrito (con el proveedor más barato disponible preseleccionado) sin salir de la pantalla; snackbar "Agregado. Ver pedido →".
**Detalle:** tap en la tarjeta expande acordeón con la mini-historia del producto ("Se vende más en semanas de calor") y link "Ver demanda completa" → preset 1 del constructor.

---

### 1.3 TIENDA / Comparador de proveedores

```
┌──────────────────────────────────┐
│ TIENDA    Catálogo  [Proveedores]│
├──────────────────────────────────┤
│ Producto: (Refresco)(Leche)(Pan) │
│           (Huevos)(Yogurt)       │
├──────────────────────────────────┤
│ LECHE PIL 1L — ¿a quién comprás? │
│ ┌──────────────────────────────┐ │
│ │ Mercado Mutualista           │ │
│ │ Bs 5,50/u · sin mínimo       │ │
│ │ ► Llega HOY (esta ronda)     │ │
│ │              [ Pedir aquí ]  │ │
│ ├──────────────────────────────┤ │
│ │ Don Lucho          −15%      │ │
│ │ Bs 4,70/u · mínimo 12 u      │ │
│ │ ◷ Llega la PRÓXIMA semana    │ │
│ │              [ Pedir aquí ]  │ │
│ ├──────────────────────────────┤ │
│ │ La Ramada          −25% ★    │ │
│ │ Bs 4,10/u · mínimo 24 u      │ │
│ │ ◷ Llega la PRÓXIMA semana    │ │
│ │              [ Pedir aquí ]  │ │
│ └──────────────────────────────┘ │
│ Barato = esperar y comprometerte.│
│ Rápido = pagar más. Ustedes elig.│
└──────────────────────────────────┘
```

**Qué muestra:** para el producto elegido (chips arriba), 3 tarjetas de proveedor con las 3 variables clave en el mismo orden siempre: **precio/u, mínimo de compra, cuándo llega**. La entrega inmediata lleva ► y "HOY"; el lead time lleva ◷ y "PRÓXIMA semana" en negrita — es LA decisión pedagógica del juego y se le da el máximo peso visual. Una línea fija de moraleja abajo.
**Acción principal:** "Pedir aquí" → abre el carrito con producto+proveedor precargados y el foco en la cantidad.

---

### 1.4 PEDIDO — Orden de compra (carrito)

```
┌──────────────────────────────────┐
│ TU PEDIDO — Semana 2   ⏱ 04:10  │
├──────────────────────────────────┤
│ ▉ Refresco 2L · La Ramada  −25%  │
│   Bs 6,00/u   ◷ llega sem. 3     │
│   [ − ]   24   [ + ]    Bs 144   │
│ ─────────────────────────────────│
│ ▉ Leche PIL · Mutualista ► hoy   │
│   Bs 5,50/u                      │
│   [ − ]   10   [ + ]    Bs  55   │
│ ─────────────────────────────────│
│ + Agregar producto               │
├──────────────────────────────────┤
│ Total pedido:            Bs 199  │
│ Caja:  Bs 640 → te quedan Bs 441 │
│ ██████████░░░░░ 31% de tu caja   │
├──────────────────────────────────┤
│ ▲ Ver datos (arrastrá hacia arr.)│
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │     ENVIAR PEDIDO  ✓         │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

**Qué muestra:** líneas de pedido con stepper gigante (botones − / + de 56×56px: el celular pasa de mano en mano y los deditos apurados fallan), precio unitario ya con descuento, insignia de entrega (► hoy / ◷ semana N), subtotal por línea, y el **impacto en caja EN VIVO**: "te quedan Bs 441" + barra de % de caja comprometida. Si el total supera la caja, el botón se desactiva y la barra se pone roja con texto "Te faltan Bs 82. Sacá algo del pedido." Si una línea no llega al mínimo del proveedor: "La Ramada pide mínimo 24 u. Te faltan 6." inline en la línea.
**Acción principal:** "ENVIAR PEDIDO" → diálogo de confirmación: *"¿Enviamos? Pueden cambiarlo hasta que cierre la ronda."* → estado enviado: banner verde "Pedido enviado ✓ — pueden editarlo hasta el cierre" (editable hasta cierre elimina el pánico del botón único).
**El asa "▲ Ver datos"** abre el bottom sheet con gráficos SIN salir del carrito (ver sección 2.4).

---

### 1.5 RESULTADO DE RONDA — con trazabilidad del inventario

Takeover a pantalla completa, en 2 actos con scroll:

```
┌──────────────────────────────────┐
│ SEMANA 2 — ¿CÓMO LES FUE?        │
├──────────────────────────────────┤
│         GANANCIA                 │
│         + Bs 87                  │
│         ✓ semana en verde        │
│   Puntaje 379 (#6, subieron ▲2)  │
├──────────────────────────────────┤
│ EL VIAJE DE TU INVENTARIO        │
│                                  │
│  Tenían en estante        38 u   │
│        +                         │
│  Llegó pedido (Mutual.)   10 u   │
│        =                         │
│  Para vender              48 u   │
│                                  │
│  Clientes que vinieron    53     │
│  Vendieron              − 46 u   │
│  Se fueron sin comprar     7 ✕   │
│     (perdieron Bs 21 de venta)   │
│                                  │
│  Se venció (pan)         − 2 u   │
│     (tiraron Bs 8 a la basura)   │
│        =                         │
│  ► QUEDA PARA SEMANA 3    ...... │
│  ▉ Refresco 12  ▉ Leche 0 ✕      │
│  ▉ Pan 0  ▉ Huevos 3  ▉ Yogurt 5 │
├──────────────────────────────────┤
│ ◷ Viene en camino (La Ramada):   │
│   ▉ Refresco 24 u — llega sem. 3 │
├──────────────────────────────────┤
│ [ Ver podio ]  [ Ir a semana 3 ] │
└──────────────────────────────────┘
```

**Qué muestra:** primero el número emocional (ganancia con signo y color+ícono), luego el "río del inventario": la ecuación vertical **estante inicial + llegadas = disponible − ventas − vencidos = estante final**, con las pérdidas SIEMPRE traducidas a Bs ("perdieron Bs 21 de venta" hace tangible el costo de quiebre; "tiraron Bs 8 a la basura" hace tangible la merma). Cierra con lo que viaja a la siguiente ronda: estante final por producto Y pedidos en tránsito. Acordeón "ver por producto" para el detalle fino.
**Acción principal:** "Ir a semana 3" (vuelve al dashboard). Este resultado queda accesible después en Inicio → "Ver más".

---

### 1.6 PODIO — Ranking

```
┌──────────────────────────────────┐
│ PODIO — después de la semana 2   │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │  USTEDES: #6 de 20   ▲2      │ │
│ │  379 pts · a 45 pts del top 3│ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ 1  Sonso Power          482  ▲1  │
│ 2  Las Paceñitas        471  ▼1  │
│ 3  Cambas del Cambio    424  ▲4  │
│ 4  Los Tojos            410  —   │
│ 5  Team Somó            391  ▼2  │
│ 6  LOS CUÑAPÉS TURBO    379  ▲2  │ ← resaltado
│ 7  ...                           │
├──────────────────────────────────┤
│ Puntaje = ganancia + servicio    │
│ − merma.  ¿Cómo mejorar? Datos → │
└──────────────────────────────────┘
```

**Qué muestra:** tarjeta propia arriba SIEMPRE (con distancia al top 3: da meta concreta), lista completa con flechas de movimiento (▲▼ + número, verde/rojo + forma, no solo color), fila propia resaltada con fondo verde claro. Recordatorio de la fórmula en una línea.
**Acción principal:** link "Datos →" (a mejorar se aprende mirando los propios gráficos, no el ranking).

---

## 2. CONSTRUCTOR DE GRÁFICOS (pestaña "Datos")

### 2.1 Qué se puede graficar (7 métricas, ni una más)

| Métrica | Dimensión producto | Eje X | Tipo por defecto |
|---|---|---|---|
| Demanda del mercado (clientes que vinieron) | por producto o total | semanas (incluye 5 semanas históricas pre-juego) | Línea |
| Lo que pediste (unidades compradas) | por producto o total | semanas jugadas | Barras |
| Lo que vendiste (unidades) | por producto o total | semanas jugadas | Barras |
| Ventas perdidas (clientes que se fueron) | por producto o total | semanas jugadas | Barras |
| Tu estante al cierre (unidades o Bs) | por producto o total | semanas jugadas | Línea |
| Ganancia por semana (Bs) | solo total | semanas jugadas | Barras |
| Tu plata: caja + estante (Bs) | solo total | semanas jugadas | Barras apiladas (2 segmentos) |

**Tipos de gráfico: línea y barras. Nada más.** Ni torta, ni área, ni dispersión: con 5 puntos de datos y 17 años, línea = "cómo cambia en el tiempo" y barras = "cuánto en cada momento / comparar". La app **preselecciona el tipo correcto** según la métrica; el toggle existe solo para que jueguen. Regla dura heredada del método de dataviz: **un solo eje Y siempre** (nunca ganancia y unidades en el mismo gráfico; son dos gráficos).

### 2.2 UI: exactamente 3 selectores

```
┌──────────────────────────────────┐
│ DATOS                            │
├──────────────────────────────────┤
│ (¿Cuánto se vende?)(¿Pido bien?) │
│ (¿Dónde está mi plata?)(¿Perdí   │
│  ventas?)               ← presets│
├──────────────────────────────────┤
│ 1. ¿Qué quieren ver?             │
│    [ Demanda del mercado      ▾ ]│
│ 2. ¿De qué producto?             │
│    (Todos)(▉Refr)(▉Leche)(▉Pan)  │
│    (▉Huevos)(▉Yogurt)            │
│ 3. Tipo:   [● Línea] [○ Barras]  │
├──────────────────────────────────┤
│  u                               │
│ 30│      ▉Refresco               │
│ 20│   ●──●──●╌╌╌ ← hoy           │
│ 10│ ●─●        │                 │
│   └─────────────────             │
│    s-4 s-3 s-2 s-1 s1 s2         │
│    histórico ──── │ jugado       │
├──────────────────────────────────┤
│ [ Ver tabla ]      [ Comparar +1]│
└──────────────────────────────────┘
```

- Selector 1: dropdown de las 7 métricas con nombres en cristiano.
- Selector 2: chips de producto con el cuadradito de color fijo (Todos = línea/barra verde "total").
- Selector 3: toggle Línea/Barras (preseleccionado).
- **"Comparar +1"**: permite superponer UNA segunda serie de la MISMA unidad (ej.: demanda vs lo que vendiste; pediste vs vendiste). Máximo 2 series en pantalla — más es ruido a 17 años. Si las unidades no coinciden (Bs vs unidades), el botón explica: "Esas dos cosas se miden distinto. Miralas en dos gráficos."
- **"Ver tabla"** siempre presente: toggle a tabla de datos (además es el canal de relieve exigido por el validador para dorado/rosa, ver sección 7).
- Último punto de cada serie con **etiqueta directa** (valor visible, sin hover: en móvil el hover no existe; tap en un punto muestra tooltip).
- En el eje X, la zona histórica pre-juego se separa del juego con línea vertical punteada "← hoy": enseña la diferencia entre "datos que te dieron" y "datos que generaste".

### 2.3 Presets de 1 clic (los 4 chips de arriba)

| Chip (nombre pedagógico) | Qué carga | Lección oculta |
|---|---|---|
| **"¿Cuánto se vende normalmente?"** | Línea de demanda del mercado, producto seleccionado, histórico + jugado | Leer patrones antes de decidir (base del analista) |
| **"¿Estoy pidiendo bien?"** | Barras: "lo que pediste" vs "lo que vendiste", total, 2 series | Sobre-stock vs quiebre de un vistazo |
| **"¿Dónde está mi plata?"** | Barras apiladas caja (verde) + estante (azul) por semana | La plata parada en el estante también es tu plata |
| **"¿Cuántas ventas perdí?"** | Barras de ventas perdidas por semana, total, en rojo-serio con etiqueta en Bs | El costo invisible de quedarse sin stock |

Cada preset carga los 3 selectores ya puestos: el constructor es el mismo, los presets solo lo configuran. Los chicos que no quieran "construir" viven de los 4 chips y ya cumplen el objetivo del taller.

### 2.4 Gráfico visible mientras llenan la orden: BOTTOM SHEET

Decisión: **ni pestaña (pierden el carrito), ni split fijo (no cabe en 360px), ni modal (tapa todo)**. Bottom sheet arrastrable con 3 posiciones:

```
Posición "asa" (por defecto):     Posición media (45%):
┌───────────────────┐             ┌───────────────────┐
│  ...carrito...    │             │ ▉ Leche · [−]10[+]│
│  [−] 10 [+]  Bs 55│             │ Total Bs 199      │
│  Total Bs 199     │             ├───────────────────┤
│  te quedan Bs 441 │             │ ▼ (¿Cuánto se     │
├───────────────────┤             │    vende?) chips  │
│ ▲ Ver datos       │             │ 20│  ●──●──●      │
├───────────────────┤             │ 10│●─●            │
│ [ ENVIAR PEDIDO ] │             │   └───────────    │
└───────────────────┘             │ Leche: ~12 u/sem  │
                                  └───────────────────┘
```

En posición media se ven A LA VEZ la línea de pedido activa + el total y el gráfico con sus 4 chips de preset. El sheet recuerda el último preset usado. Arrastre arriba = pantalla completa; abajo = se guarda como asa. Debajo del gráfico, una lectura en texto de la serie ("Leche: se venden ~12 u/semana") para quien no sabe leer ejes todavía — el gráfico se auto-explica.

---

## 3. LOS 6 KPIs DEL DASHBOARD

Umbrales calibrados a capital inicial Bs 1.000 y 5 rondas. Semáforo SIEMPRE = color + ícono + palabra (✓ Sana / ! Ojo / ✕ Peligro).

| # | Nombre en cristiano | Fórmula | Formato | Verde ✓ | Amarillo ! | Rojo ✕ | Porqué pedagógico |
|---|---|---|---|---|---|---|---|
| 1 | **Caja** ("tu plata líquida") | caja anterior − compras pagadas + ventas cobradas | Bs 640 | ≥ Bs 500 | Bs 200–499 | < Bs 200 | Sin caja no comprás la próxima semana: el capital de trabajo manda. |
| 2 | **Ganancia acumulada** | Σ (ventas − costo de lo vendido − merma) | Bs 118 (con signo) | ≥ Bs 50 × ronda | Bs 0 a 50×ronda | < Bs 0 | El objetivo del negocio; con signo para que perder duela y se vea. |
| 3 | **Nivel de servicio** ("clientes atendidos") | unidades vendidas ÷ unidades demandadas, acumulado | 87% | ≥ 95% | 85–94% | < 85% | El cliente que no encuentra leche se va a la otra tienda y quizás no vuelve. |
| 4 | **Valor del estante** ("plata parada") | Σ (unidades en estante × costo) | Bs 312 (+ % de tu plata total) | 15–45% de (caja+estante) | 46–65% o < 15% | > 65% | Demasiado inventario = plata dormida (y riesgo de merma); muy poco = quiebre. Es un KPI de RANGO: los extremos son malos, y el sub-texto lo dice ("mucha plata parada" / "estante casi vacío"). |
| 5 | **Merma** ("lo que tiraron") | Σ (unidades vencidas × costo) | Bs 12 | Bs 0 | Bs 1–40 | > Bs 40 | La consecuencia visible de sobre-pedir perecederos; en Bs para que duela. |
| 6 | **Puntaje** | ganancia acumulada + 3 × servicio promedio (%) − merma | 379 pts · #6/20 | (sin semáforo: muestra posición y flecha ▲▼) | | | Conecta las 3 palancas: no gana el que más vende, gana el que planifica. |

Regla de tile: valor 28px bold arriba, semáforo abajo, y **tap = gráfico de ese KPI** en Datos.

---

## 4. PANEL DEL FACILITADOR + PANTALLA DE PROYECCIÓN

### 4.1 Panel del facilitador (laptop/tablet, ruta privada con PIN)

```
┌────────────────────────────────────────────────────────────────┐
│ SALA UPSA-24 · Ronda 2/5 · PEDIDOS ABIERTOS       ⏱ 06:32     │
│ [ +1 min ] [ Pausar ]                    Enviados: 14/20       │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐   │
│ │Cuñapés   ││Sonso Pwr ││Paceñitas ││Tojos     ││Team Somó │   │
│ │ ✓ 18:04  ││ ✓ 17:55  ││ ● edit.  ││ ✓ 18:01  ││ ⚠ sin    │   │
│ │          ││          ││          ││          ││  conexión│   │
│ └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘   │
│ ┌──────────┐┌──────────┐  ... (grilla 4×5, 20 equipos)         │
│ │Cambas C. ││Somó FC   │   ✓ enviado(verde) ● editando(ámbar)  │
│ │ ● edit.  ││ ○ quieto │   ○ sin actividad  ⚠ desconectado     │
│ └──────────┘└──────────┘                                       │
├────────────────────────────────────────────────────────────────┤
│ DEMANDA DE ESTA RONDA (editable hasta revelar):                │
│ Refresco [26] Leche [14] Pan [31] Huevos [6] Yogurt [11]       │
│ Evento: [ Ninguno ▾ ] (ej: "Feriado: refresco ×1,5")  [Aplicar]│
├────────────────────────────────────────────────────────────────┤
│              ┌────────────────────────────┐                    │
│              │   CERRAR PEDIDOS  →        │  (botón de fase)   │
│              └────────────────────────────┘                    │
│ Flujo: Abrir ronda → Cerrar pedidos → Revelar demanda →        │
│        Publicar resultados → Abrir siguiente                   │
└────────────────────────────────────────────────────────────────┘
```

- **Un solo botón primario** que avanza la máquina de estados; imposible equivocarse de orden. Confirmación solo en cierres con rezagados: *"6 equipos no enviaron. Venderán solo lo que tienen en estante. ¿Cerrar igual?"*
- Grilla 4×5: cada tile = nombre + estado + hora de envío. Tap en tile → drawer: ver pedido enviado (solo tras el cierre, para no sesgar), marcar envío manual (equipo con celular muerto dicta su pedido), renombrar, expulsar.
- Estados de tile con ícono+forma (✓ ● ○ ⚠), no solo color. `⚠` aparece a los 30 s sin heartbeat de Realtime.
- Demanda editable por producto ANTES de revelar (inputs numéricos precargados con el guion del taller) + dropdown de eventos guionados. Después de revelar, se bloquea (candado visible).
- Fila inferior fija con atajos: "Proyector ⧉" (abre la vista pública en segunda ventana), "Reiniciar timer", "Saltar ronda" (escondidos tras un "···" para que no se toquen por accidente).

### 4.2 Pantalla de proyección (ruta pública /proyector, solo lectura, controlada por la fase)

**Estado B — ronda abierta** (el que más tiempo se ve):

```
┌──────────────────────────────────────────────────────────────┐
│                         SEMANA 2                             │
│                                                              │
│                        ⏱ 06:32                              │
│                                                              │
│              Pedidos enviados:  14 / 20                      │
│         ████████████████████░░░░░░░░░                        │
│                                                              │
│   Tip: el cliente que no encuentra, compra en otra tienda.   │
└──────────────────────────────────────────────────────────────┘
```
(Timer a 220px; muestra CUÁNTOS enviaron, jamás QUÉ pidieron. Tips rotan cada 30 s.)

**Estado C — revelación de demanda** (conteo animado tipo tómbola, 1 producto por segundo):

```
┌──────────────────────────────────────────────────────────────┐
│              ESTA SEMANA VINIERON A COMPRAR...               │
│                                                              │
│   ▉ Refresco   ▉ Leche    ▉ Pan     ▉ Huevos   ▉ Yogurt      │
│      26          14         31         6          11        │
│                                                              │
│        ¡FERIADO! La gente compró más refresco (×1,5)         │
└──────────────────────────────────────────────────────────────┘
```

**Estado D — leaderboard con revelación dramática** (controlada por el facilitador con barra espaciadora / botón "siguiente"): puestos 20→11 aparecen de golpe en lista rápida; 10→4 de a uno (1,5 s); top 3 en podio con marco dorado, uno a uno del 3 al 1.

```
┌──────────────────────────────────────────────────────────────┐
│                 PODIO — SEMANA 2          LOS QUE SUBEN      │
│                                           ▲5 Cambas del C.   │
│        ┌────────┐                         ▲3 Los Tojos       │
│  ┌─────┤ SONSO  ├─────┐                   ▲2 Cuñapés Turbo   │
│  │ 2do │ POWER  │ 3ro │                                      │
│  │Pace-│ 482pts │Camb-│                   LOS QUE BAJAN      │
│  │ñitas│  1ro   │as C.│                   ▼4 Team Somó       │
│  ├─────┴────────┴─────┤                   ▼2 Las Abejas      │
│  4to Los Tojos    410 │                                      │
│  5to Team Somó    391 │  [gráfico: barras de ganancia        │
│  ...                  │   acumulada del top 10, todas verdes,│
│                       │   líder con borde dorado]            │
└──────────────────────────────────────────────────────────────┘
```

El gráfico comparativo es de **categoría nominal: todas las barras del mismo verde** (nunca arcoíris de 20 colores), líder marcado con borde dorado + corona de trazo. Tipografía del leaderboard ≥ 48px por fila; ver sección 7.

---

## 5. ONBOARDING DEL EQUIPO EN < 5 MINUTOS

| Paso | Pantalla | Tiempo | Microcopy clave |
|---|---|---|---|
| 1 | **Entrar**: QR proyectado + código de 4 letras (`UPSA`) en input gigante | 0:45 | "Escaneá el QR o entrá a stockperfecto.app y poné el código de la pantalla." |
| 2 | **Nombre de equipo**: la app propone 3 nombres generados de una lista pre-aprobada (adjetivo + sustantivo local: *Los Cuñapés Turbo, Sonso Power, Cambas del Cambio, Team Somó, Los Tojos Veloces, Las Urinas FC…* ~40 sustantivos × ~15 adjetivos, todos curados). Botón "Otras opciones" re-sortea. **Sin campo de texto libre** → cero nombres problemáticos en el proyector, cero moderación, y es más rápido que tipear entre 5. | 0:30 | "Elijan su nombre de tienda:" / "(Otras opciones)" |
| 3 | **Logo**: elegir 1 de 12 íconos dibujados (canasta, gorra, mate, tucán, jaguar…) — íconos propios, no emoji del sistema, para que se vean iguales en proyector y celular. | 0:20 | "Elijan el logo de su tienda." |
| 4 | **Brief en 3 tarjetas** (swipe, barra de progreso ○●○): T1 *"Heredaron la tienda de la abuela en el barrio. Tienen Bs 1.000 y 5 semanas para demostrar que pueden hacerla crecer."* T2 *"Cada semana deciden QUÉ comprar, CUÁNTO y A QUIÉN. Lo que no se vende, se queda en el estante… o se vence."* T3 *"Gana el equipo que más gana plata SIN dejar clientes colgados NI tirar comida. Piensen como analistas: primero miren los datos, después pidan."* Cada tarjeta ≤ 35 palabras, ilustración simple, botón "Siguiente". | 1:30 | Botón final: "Entendido" |
| 5 | **Tour de 3 globos** sobre el dashboard real (1 por pestaña clave): "Acá están sus números" (Inicio) → "Acá compran" (Tienda) → "Acá miran los datos antes de decidir" (Datos). Saltables. | 0:45 | "¡Dato clave! Antes de pedir, miren '¿Cuánto se vende normalmente?'" |
| 6 | **Listos**: botón gigante que reporta al panel del facilitador y a la proyección (la grilla del lobby se va llenando de logos: presión social positiva para los lentos). | 0:10 | "¡ESTAMOS LISTOS!" / después: "Listos ✓ — esperando a las demás tiendas… (14/20)" |

Total: ~4 minutos. Los pasos 2-3 los puede hacer un integrante mientras los demás leen el brief impreso en la mesa (recomendar al facilitador imprimir el brief como respaldo físico).

---

## 6. ESTADOS FEOS — MICROCOPY EXACTO

| Estado | Título | Cuerpo | Acción / comportamiento |
|---|---|---|---|
| **Esperando a que abra la ronda** | "Todavía no abre la semana 3" | "El facilitador la abre en un rato. Mientras tanto: ¿ya vieron cómo les fue en sus gráficos?" | Botón "Ver mis datos" (convierte tiempo muerto en análisis, que es el objetivo del taller). Ilustración de la tienda con persiana a medio abrir. |
| **Ronda cerrada, esperando resultados** | "¡Pedido adentro! Se cerró la semana" | "La tienda está atendiendo… en un momento sabrán cuánto vendieron." | Animación sutil de puerta de tienda + puntos suspensivos. Sin botones (que no se vayan de la pantalla: el resultado llega por Realtime como takeover). |
| **Sin conexión, reintentando** | "Se cortó la señal" | "Tranquilos: su pedido está guardado en este celular. Reconectando…" (+contador de reintento). Si vuelve: toast verde "¡Volvió la señal! Todo sincronizado ✓". Si estaban editando el carrito: "Su carrito sigue acá. Revisen y envíen de nuevo por si acaso." | Reintento automático con backoff + botón "Reintentar ahora". El carrito vive en localStorage; el banner es amarillo con ícono ⚠, NUNCA rojo (rojo = culpa; esto no es culpa de ellos). |
| **No enviaste a tiempo** | "Se cerró la semana y no enviaron pedido" | "Esta semana la tienda vende solo lo que ya tenían en el estante. No es el fin del mundo — pero pónganse las pilas para la semana 4: pongan una alarma mental a los 2 minutos del cierre." | Con inventario viajando entre rondas, no enviar ya NO regala ganancia 0 competitiva (corrige el bug de diseño v1): venden su stock remanente y sufren quiebre natural. El copy lo explica sin humillar. Botón "Ver qué tenían en el estante". |
| **Expulsado / sala terminada** (bonus) | "La sesión terminó" | "¡Gracias por jugar! Sáquenle captura a sus gráficos — son de ustedes." | Botón "Ver mi resumen final" (pantalla compartible con los 6 KPIs finales y posición). |

Regla de tono en todos: primera persona del plural ("enviaron", "tranquilos"), sin tecnicismos ("señal", no "conexión al servidor"), siempre UNA cosa que hacer.

---

## 7. SISTEMA VISUAL

### 7.1 Paleta: se MANTIENE la de UPSA, pero con roles estrictos (medidos, no estimados)

| Color | Hex | Contraste s/ blanco | Rol permitido | Prohibido |
|---|---|---|---|---|
| Verde UPSA oscuro | `#015941` | 8,38:1 ✓ | AppBar, títulos, texto sobre blanco, fondo de hero con texto blanco | — |
| Verde UPSA | `#129045` | 4,12:1 | Botón primario (texto blanco ≥16px semibold), serie "tu equipo/total" en gráficos, fila propia en ranking | Texto pequeño sobre blanco (usar `#0B6B33`, 6,63:1) |
| Naranja acento | `#EB6834` | 3,20:1 | Badge de "Pedido" pendiente, timer en alerta, chips de evento | **Serie de gráfico junto al verde** (ver 7.2), texto normal sobre blanco |
| Dorado | `#C9A227` | 2,42:1 | Podio top 3, bordes de logro, serie de gráfico (solo con etiqueta directa) | Texto sobre blanco (usar `#7A5F0E`, 6,05:1 para texto "dorado") |

### 7.2 Paleta de series para gráficos — VALIDADA con el validador CVD (protanopia/deuteranopia, Machado 2009)

Hallazgo medido, no opinión: **verde UPSA `#129045` y naranja `#EB6834` adyacentes como series son indistinguibles bajo protanopia (ΔE 2,1, colapso total)**. La marca UPSA es verde+naranja, así que la tentación de usar ese par para "tú vs rival" existe y hay que vetarla explícitamente en el design system.

Paleta de series aprobada (orden fijo = mecanismo de seguridad CVD; todas las verificaciones pasan sobre blanco `#FFFFFF`, peor par adyacente ΔE 13,4 deutan / 20,2 visión normal):

| Slot | Hex | Asignación FIJA (el color sigue a la entidad en TODA la app) |
|---|---|---|
| 1 | `#129045` verde | Tu equipo / Total |
| 2 | `#2A78D6` azul | Refresco 2L (y "mercado/promedio" en comparaciones) |
| 3 | `#EB6834` naranja | Maple de huevos |
| 4 | `#4A3AA7` violeta | Leche PIL |
| 5 | `#C9A227` dorado | Pan de batalla |
| 6 | `#E87BA4` rosa | Yogurt |

Condición del validador: dorado (2,42:1) y rosa (2,69:1) están bajo 3:1 sobre blanco → **canal de relieve obligatorio**: etiquetas directas en el último punto de cada serie + botón "Ver tabla" siempre presente (ya especificados en 2.2). Comparación "pediste vs vendiste" usa verde vs azul (nunca verde vs naranja). En barras apiladas, separador de 2px blanco entre segmentos.

### 7.3 Semáforos de KPI (estado, nunca reutilizados como serie)

| Estado | Color texto/ícono | Ícono + palabra (obligatorios: nunca color solo) |
|---|---|---|
| Bien | `#0B6B33` (6,63:1) | ✓ + "Sana / En verde" |
| Atención | `#B45309` (5,02:1) | ! + "Ojo" |
| Peligro | `#B91C1C` (6,47:1) | ✕ + "Peligro" |

### 7.4 Tipografía y legibilidad de proyector

- Fuente única: system sans (`system-ui, "Segoe UI", Roboto`) — cero fuentes externas, carga instantánea en gama media. `tabular-nums` en tablas, KPIs y leaderboard (los números no bailan al animar).
- **Escala móvil**: cuerpo 16px / etiquetas 14px (mínimo absoluto) / títulos de sección 20px semibold / valor de KPI 28px bold / ganancia en resultado 40px bold.
- **Escala proyector (1080p, aula ~10 m)**: regla práctica = altura de letra ≥ 25 mm por cada 10 m de distancia → en pantalla de 2,5 m de ancho, **nada bajo 32px**; filas de leaderboard 48–56px; timer y demanda revelada 160–220px; tips 36px. Todo texto de proyección en blanco o `#0b0b0b` sobre fondos planos (verde oscuro o blanco): jamás texto sobre foto.
- Contraste mínimo AA 4,5:1 en todo texto de celular (valores exactos ya dados arriba).

### 7.5 Accesibilidad básica realista (lo que sí se puede garantizar en un taller)

1. **No-solo-color en todo**: semáforos con ícono+palabra, movers del ranking con ▲▼+número, estados del facilitador con ✓●○⚠, series con etiqueta directa y cuadradito junto al nombre del producto.
2. **Targets táctiles ≥ 48×48px**; steppers del carrito 56px (dispositivo compartido, dedos apurados).
3. **Paleta de series validada por script contra daltonismo** (no a ojo), con el veto verde/naranja documentado.
4. "Ver tabla" en cada gráfico = equivalente textual de toda visualización.
5. Timer con triple canal: número + cambio de color + parpadeo/vibración al final.
6. Foco visible y orden lógico de tabulación (hay chicos que navegarán con TalkBack o teclado; etiquetas `aria-label` en steppers: "Aumentar refresco, ahora 24 unidades").

### 7.6 Costo de implementación (para el lente técnico)

Los gráficos descritos son líneas y barras de ≤ 6 puntos × ≤ 2 series: **SVG a mano o Recharts bastan**; no hace falta librería de charting pesada. El bottom sheet es CSS (`position: sticky` + drag handle con `touch-action`). La proyección es una ruta Next.js suscrita a los mismos canales Realtime que ya existen. Nada de esta capa UX exige cambios de infraestructura.
