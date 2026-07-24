# Stock Perfecto v2 — "La Tiendita de Doña Peta" 🏪

**Plan maestro del rediseño** · 23-jul-2026 · rev. 2 (post-crítica adversarial)
Taller de planificación de supply chain para jóvenes pre-universitarios · UPSA · ~20 equipos · ~120 min

> Este documento sintetiza cinco diseños especializados (pedagogía, economía, mecánicas,
> arquitectura, UX) y tres críticas adversariales (simplicidad, factibilidad, balance),
> todos en [`docs/design/`](./docs/design/). **Cuando este plan y un anexo difieran, manda
> este plan.** Regla dura de los críticos que este documento obedece: *ningún número de
> balance vive en dos documentos — la tabla de parámetros de §2 es la única fuente de verdad.*

---

## 0. Resumen ejecutivo

La v1 es un newsvendor de una sola decisión: útil como prototipo, pobre como experiencia.
La v2 lo convierte en una **simulación 360° de una tienda de barrio cruceña**, jugada por
equipos, donde el inventario, la caja y la reputación **viajan entre rondas**:

- **Narrativa:** los equipos heredan por 5 semanas la tienda de **Doña Peta** (Pampa de la
  Isla, Santa Cruz), con plata en el cajón, mercadería en el estante y el *cuaderno de
  ventas* de las últimas 8 semanas. Enfrente acaba de abrir el rival: **Almacén Don Lucho**.
- **Decisión por ronda:** qué comprar, cuánto y **a quién** — 2 proveedores con UN
  trade-off claro: el camión barato que llega la próxima semana vs. el rival caro que
  entrega hoy.
- **Motor real de supply chain:** lotes con vencimiento (FEFO), lead time, compra por
  cajas, mermas, costos fijos, flujo de caja y liquidación final.
- **Datos desde el minuto 1:** histórico de 8 semanas + 4 KPIs + gráficos con presets de
  1 clic. El lema del taller: *"Lean el cuaderno. Los números no mienten."*
- **Puntaje de una línea, absoluto y auditable a mano** — sin normalizaciones por cohorte
  ni siglas. No jugar pierde por diseño (bug v1 resuelto por la economía del juego).
- **Técnica:** se conserva la infraestructura buena de v1 (RLS pública/secreta, route
  handlers con service role, Realtime) y se reescribe el dominio. **MVP: ~12 días-persona**,
  con la robustez de red construida PRIMERO.

---

## 1. Qué cambia respecto a v1

| Dimensión | v1 (actual) | v2 (este plan) |
|---|---|---|
| Jugador | Individual | **Equipo** (3-5 chicos, 1 celular, autorregistro controlado en el lobby) |
| Producto | 1 implícito | **6 productos** con costo, precio, vencimiento y rol pedagógico (4 activos en R1) |
| Compra | "Cuántas unidades preparo" | **Orden multi-producto a 2 proveedores** (lead time vs. hoy-caro) |
| Inventario | Se resetea cada ronda | **Viaja**: lotes FEFO, vencimientos, en-tránsito, liquidación final |
| Dinero | No existe | **Caja limitada** + costos fijos + almacenaje + deuda si no alcanza |
| Datos | Nada hasta la ronda 3 | **8 semanas de histórico + KPIs + gráficos desde la ronda 0** |
| Eventos | No hay | **Kermesse anunciada (R3)** + **falla del camión (R4)** — uno que premia *leer*, otro que premia *haberse cubierto* |
| Puntaje | Solo ganancia (no jugar ≈ ganar) | **Valor de la Tienda** = caja + liquidación + bono de servicio − deuda |
| Narrativa | Ninguna | Brief de Doña Peta + debrief guiado con 5 conceptos |
| Facilitador | Panel básico | Panel 20 equipos (semáforo de envíos, timer con autocierre) + proyección |

---

## 2. Tabla única de parámetros (fuente de verdad)

Todo número de balance sale de aquí. Cambiar algo aquí ⇒ re-correr
`npm run calibrate`. `tools/sim.py` se conserva como lanzador compatible del
calibrador canónico `tools/calibrate.mjs`.

| Parámetro | Valor |
|---|---|
| Equipos | Hasta 20; un representante por mesa registra nombre e integrantes mientras el lobby está abierto |
| Rondas | 5 + R0 de exploración · 1 ronda = 1 semana |
| Decisión | **6 min predeterminados**, editables por sala y por ronda antes o durante la apertura; autocierre con `closes_at` |
| Catálogo | **6 productos** (§4.1) · en R1 solo 4 activos (huevos y detergente entran en R2) |
| Proveedores | **2** (§4.2): La Principal (lead 1) · Don Lucho (hoy, tope 40 u/producto/semana; **25 en R4**) |
| Caja inicial | **Bs 800** *(calibrado; ver §4.5)* |
| Inventario heredado | Refresco 20 · Pan 60 (vence R1) · Leche 12 (vence R1) · Snacks 40 · Huevos 2 maples · Deterg 4 |
| Costo fijo | **Bs 60/ronda** — si no alcanza la caja, el faltante queda como **deuda** (nunca bloquea jugar) |
| Almacenaje | Bs 0,20 por unidad remanente al cierre |
| Merma | 100% del costo pagado por unidad vencida |
| Liquidación (fin R5) | Stock vigente **50% del costo** · vencido **0** (dos niveles, no tres) |
| Pago | Al pedir (también lo que viaja en camión) |
| Caja negativa por compras | Imposible: la UI y el servidor bloquean pedidos que exceden la caja |
| Préstamos / crédito / descuentos por volumen | **NO existen en v2** (pospuesto; única excepción: promo puntual de R2, opcional) |
| Sin envío a tiempo | R1: pedido conservador automático · R2-R5: **compra 0**, vende lo del estante |
| Demanda | Guionada + **ruido ±10% horneado UNA vez** al crear la sesión (semilla) · idéntica para los 20 equipos · anuncios en rango vago ("hasta el doble"), nunca el multiplicador exacto |
| Histórico | 8 semanas, **1 pico marcado** ("la semana del festival del colegio") |
| **Puntaje** | **Valor de la Tienda = Caja + Liquidación del estante + (Bs 5 × punto de % de servicio promedio) − Deuda** |
| Desempates | Mayor % servicio → menor merma en Bs |
| KPIs en dashboard | **4**: Caja · Ganancia · Caseros atendidos (%) · Merma (el Valor/puesto vive en Podio) |
| Conceptos con nombre | **5**: pronóstico · lead time · colchón (stock de seguridad) · quiebre/nivel de servicio · merma |

**Por qué este puntaje** (veredicto conjunto de los 3 críticos, ver §3): es UNA línea,
absoluta (no depende de lo que hagan otros equipos), calculable a mano con la Hoja del
Analista, y encarna el mensaje: caja = plata hecha, liquidación = mercadería útil vale la
mitad, bono = los caseros atendidos también son plata. El fantasma pierde solo (fijos +
inventario que se agota + bono de servicio hundido). MAPE, componente "salud de
inventario" y normalización por cohorte: **eliminados** — "Mejor Pronóstico" sobrevive
como premio secundario automático (§4.7).

---

## 3. Qué cambió tras la crítica adversarial

Los 3 críticos ([06](./docs/design/06-critica-simplicidad.md) ·
[07](./docs/design/07-critica-factibilidad.md) ·
[08](./docs/design/08-critica-balance.md)) revisaron los 5 diseños fuente. Hallazgos
aceptados y absorbidos por este plan:

| # | Hallazgo (crítico) | Cambio en el plan |
|---|---|---|
| 1 | Los 5 diseños describían **4 juegos distintos** (4/5/6/13 productos, 5 fórmulas de puntaje, capital 800-2000) (todos) | Esta tabla única §2; los lentes ceden, nadie implementa desde su propio documento |
| 2 | Puntaje multi-KPI **explotable**: JIT con el proveedor exprés satura servicio+salud+"mejor pronóstico" sin analizar; normalización min-max = el peor equipo mueve el ranking ajeno (balance) | Fórmula absoluta de una línea; sin cohorte; premio de pronóstico con piso de servicio ≥ 90% |
| 3 | El motor técnico traía una **tercera fórmula propia** (0.5/0.3/0.2 por ronda) que nadie diseñó (balance) | El engine implementa LA fórmula de §2; test obligatorio: "JIT-Lucho no gana" y "fantasma queda último" |
| 4 | 3 proveedores = dos canales inmediatos redundantes; 13 productos inoperable (simplicidad, factibilidad) | **2 proveedores**, 6 productos (4 en R1); La Ramada sale de la app |
| 5 | Canal exprés sin tope **desactiva la lección del lead time** (la kermesse se rescata barato) (simplicidad, balance) | Don Lucho con **tope 40 u/producto/semana** ("lo que entra en la moto"); en R4 baja a 25 |
| 6 | Exprés con margen positivo en todo = comprar siempre ahí es viable (balance) | Regla de dominancia: el lento siempre ≥5% más barato; **la leche en Don Lucho tiene margen NEGATIVO** (rescatás al casero, no al bolsillo) |
| 7 | Demanda guionada y anunciada con magnitud = **juego resuelto tras R2**, empates masivos (balance) | Ruido ±10% horneado con semilla + anuncios en rango vago |
| 8 | R2 metía 4 conceptos de golpe; 10 conceptos en 2 h no fijan (simplicidad) | 1 concepto nuevo por ronda; 5 conceptos con nombre; MOQ se dice "se compra por cajas" sin nombrarlo; rotación y flujo de caja solo como frase del debrief final |
| 9 | Timing 120/120 con colchón cero; primera compra en el minuto 29; hojas incontestables en 7 min (simplicidad) | Guion de **106 min + 14 de colchón**; primera compra antes del minuto 20; Hoja del Analista de **2 preguntas** por ronda |
| 10 | Quiebra indefinida: fijos con caja insuficiente, equipos-zombi (balance) | Fijos impagos = **deuda** que se descuenta del Valor final, nunca bloquea jugar; sin préstamo (Don Lucho sin mínimo ya es la red: se compra de a 1 unidad) |
| 11 | Robustez de red planificada al FINAL siendo el riesgo #1 (factibilidad) | **F1 del roadmap** (día 1-2), probada con celulares reales de pantalla bloqueada |
| 12 | Onboarding optimista; nombres libres = riesgo en proyector (simplicidad, factibilidad) | Autorregistro con cupo, unicidad, validación, lista moderable y cierre de inscripciones; cada alta recibe credencial privada de recuperación |
| 13 | Bottom sheet arrastrable, tómbola, generador de nombres = d-p que no mueven la aguja (factibilidad) | MVP: panel "Ver datos" desplegable simple, proyección estática, sin generador; todo lo teatral lo pone la voz del facilitador |
| 14 | Merma restada DOS veces en el puntaje UX; mock que no cuadra (367≠379) (balance) | La merma golpea una sola vez (dentro de caja/ganancia); regla de QA: todo número de ejemplo sale de la fórmula final |
| 15 | Revisar 100 hojas físicas "en 3 min" es imposible (simplicidad) | Premio de proceso = "Mejor Pronóstico" **calculado por la app**; las hojas se premian solo si los asistentes preseleccionan 3 durante R4 |

Descartes conscientes (con el porqué): el catálogo de 13 productos, el 4º proveedor,
crédito/descuentos/fill-rate continuo, piloto automático que repite órdenes, constructor
libre de gráficos, badges por ronda (quedan 2), noticias in-app, certificado QR con
ceremonia → **carpeta "2ª edición"**, listados en §10.

---

## 4. El juego

### 4.1 Catálogo (6 productos — 4 activos en R1)

Cada producto existe para enseñar algo. Precios de calle Santa Cruz 2026, redondeados
para jugabilidad (pasada final en calibración).

| SKU | Producto | Precio venta | Vida útil | Demanda base/sem | Desde | Rol pedagógico |
|---|---|---|---|---|---|---|
| REFRESCO | Refresco 2L | Bs 15,00 | No vence | ~45 | R1 | Estrella estable; pico en eventos |
| PAN | Pan de batalla (u) | Bs 0,80 | **1 semana** | ~150 | R1 | Perecedero extremo: lo que sobra se bota |
| LECHE | Leche PIL 1L | Bs 7,50 | **2 semanas** | ~30 | R1 | Perecedero medio; margen fino, "trae caseros" |
| SNACKS | Snack surtido (bolsita) | Bs 2,50 | No vence | ~110 | R1 | Margen % alto; pico fuerte en eventos |
| HUEVOS | Maple de huevos (30 u) | Bs 36,00 | 3 semanas | ~8 | R2 | Ticket alto: un maple de más duele en caja |
| DETERG | Detergente 400 g | Bs 11,00 | No vence | ~6 | R2 | **Trampa de plata dormida**: rotación lenta |

### 4.2 Proveedores (2) — un solo trade-off, pero que muerde

| | 🚚 **Distribuidora "La Principal"** | 🛵 **Almacén Don Lucho** (el rival de enfrente) |
|---|---|---|
| **Cuándo llega** | **La PRÓXIMA semana** (lead time 1) | **HOY** (misma ronda) |
| **Precio** | El más barato | **Precio de castigo** (+20-30%) |
| **Cómo se compra** | Por cajas: Refresco ×6 · Pan ×10 · Leche ×6 · Snacks ×24 · Huevos ×3 · Deterg ×12 | Suelto, sin mínimos |
| **Tope** | Sin tope | **40 u/producto/semana** ("lo que entra en la moto del changuito") · **25 en R4** |
| **Disponible** | Desde R2 · **bloqueada en R5** ("ya no llegaría") | Siempre |
| **Lección** | Planificar con anticipación paga | El impuesto a la improvisación — y tragarse el orgullo |

Ofertas (costo unitario provisional, Bs — regla de dominancia: el lento siempre ≥5% más barato):

| Producto | La Principal (próx. semana) | Don Lucho (hoy) | Margen si rescatás con Lucho |
|---|---|---|---|
| Refresco 2L | 10,50 | 13,00 | +2,00 |
| Pan | 0,50 | 0,65 | +0,15 |
| Leche 1L | 5,60 | **7,80** | **−0,30** ⚠ rescatar leche PIERDE plata: protege al casero, no al bolsillo |
| Snack | 1,50 | 2,00 | +0,50 |
| Maple huevos | 27,00 | 34,00 | +2,00 |
| Detergente | 8,00 | 10,50 | +0,50 |

En R1 el camión "ya pasó" (se ve en gris: *"atiende desde la semana 2"*): la primera
semana se sobrevive con la herencia + compras chicas a Don Lucho. Desde el día 1 el
equipo siente por qué necesita al camión — y en R2, lo que le pida llega **justo para la
kermesse**.

### 4.3 Demanda: histórico + guion de 5 rondas

**El cuaderno de Doña Peta** — 8 semanas por producto, materializado al crear la sesión
(generador determinista con semilla), con **1 pico marcado y explicable**: *"semana del
festival del colegio"* (refresco y snacks saltan ~+30%). El equipo que grafica lo descubre
y dimensiona la kermesse.

**Guion de las 5 rondas** (secreto, editable por el facilitador; ruido ±10% ya horneado;
idéntico para los 20 equipos):

| Ronda | Lo que se anuncia (rango vago, nunca el multiplicador) | Multiplicadores reales |
|---|---|---|
| R1 | "Semana normal — conozcan su tienda" | ×1,0 |
| R2 | "Hace calorcito" + **afiche: KERMESSE la próxima semana — "puede venderse hasta el doble en bebidas y snacks"** | Refresco ×1,15 |
| R3 | **"¡KERMESSE!"** | Refresco ×1,8 · Snacks ×1,7 · Pan ×1,4 · Huevos ×1,2 |
| R4 | "Semana tranquila… y **el camión se plantó en la carretera: llega la MITAD** (te devuelven la plata del resto). A Don Lucho también le queda poco (máx. 25 por producto)" | Refresco ×0,85 · Snacks ×0,85 · resto ×1,0 |
| R5 | "Vuelve Doña Peta — el estante sobrante valdrá la mitad" | ×1,0 |

Diseño de eventos (regla de los críticos): **solo 2 con peso mecánico** — uno anunciado
(kermesse: premia *leer*) y uno sorpresivo (camión: premia *haberse cubierto*). El calor
de R2 es color narrativo. Promo opcional de R2 (si el grupo va rápido): *"La Principal:
refresco a Bs 9,50 si pedís 60 o más"* — descuento por volumen como evento puntual, no
como sistema.

### 4.4 Las rondas — un concepto nuevo por ronda, nunca dos

| Ronda | Nombre | Concepto NUEVO | La decisión | Duración |
|---|---|---|---|---|
| **R0** | "Bienvenidos a la tienda" | Leer datos antes de decidir | Micro-reto sin puntaje: "¿promedio semanal de refresco?" | 6' |
| **R1** | "La primera semana" | **Pronóstico** (promedio y rango del cuaderno) | Compras de hoy a Don Lucho (4 productos) | 11' |
| **R2** | "Llega el camión" | **Lead time** ("lo que pedís hoy llega la próxima") | Doble horizonte: qué necesito YA (Lucho) + qué quiero tener la próxima (Principal, por cajas). Afiche de kermesse a la vista | 12' |
| **R3** | "La kermesse" 🎉 | **Quiebre / nivel de servicio** (se nombra en el debrief, después de vivirlo) | Cubrir el pico con lo que llega + rescates capados de Lucho | 13' |
| **R4** | "El camión se plantó" 🚚💥 | **Colchón (stock de seguridad)** + merma post-fiesta | Replanificar con la mitad de lo esperado y Lucho a 25 | 12' |
| **R5** | "Vuelve Doña Peta" | Fin de horizonte (el estante lleno el último día es plata perdida) | Última compra fina; Principal bloqueada | 11' |

**Cierre de ronda — orden de operaciones del motor** (el equipo lo ve narrado):

```
1. LLEGADAS      pedidos al camión que arriban (R4: 50% + reembolso)
2. DEMANDA       se revela la demanda del guion (idéntica para todos)
3. VENTAS        min(disponible, demanda), lotes FEFO (primero lo que vence)
4. MERMAS        lotes vencidos → basura (merma en Bs = costo pagado)
5. COSTOS        fijos Bs 60 (si no alcanza → deuda) + almacenaje 0,20/u
6. KPIs/PUNTAJE  caja, ganancia, servicio, merma → Valor de la Tienda → ranking
7. TRAZABILIDAD  "Tenías 40 → llegaron 30 → vendiste 55 → se vencieron 3 → te quedan 12"
                 + cascada de caja en una línea
```

### 4.5 Puntuación y premios

**PUNTAJE (visible desde R0, fijo en pantalla):**

> **Valor de la Tienda = Caja + Estante vigente al 50% del costo + Bs 5 por cada punto de
> % de caseros atendidos − Deuda**

Auditable a mano: un equipo puede reconstruir su puntaje con la Hoja del Analista. Sin
normalizaciones, sin siglas, sin depender de otros equipos.

**Premios:**
- 🏆 **Mejores Analistas del Barrio** — mayor Valor de la Tienda (desempate: % servicio, luego menor merma)
- 🥈 **Servicio 5 Estrellas** — mayor % servicio, elegible solo con Valor ≥ umbral fijado en calibración (candado anti-"compro infinito")
- 🔮 **Mejor Pronóstico** — calculado por la app (disponible vs. demanda), **piso de servicio ≥ 90%** (fix del min-maxer: que no lo gane quien no pronostica)
- 📝 **Mejor Analista** — mejor Hoja del Analista física (solo si los asistentes preseleccionan 3 durante R4)
- Badges sin puntos: solo 2 — "Ojo Clínico" (mejor servicio en la kermesse) y "Aterrizaje Perfecto" (R5: servicio ≥ 90% con menor sobrante)

**QA de balance obligatorio (antes del evento):** re-correr [`tools/sim.py`](./tools/sim.py)
(adaptado al catálogo de 6) con **estrategias de ataque**, no solo arquetipos amables:
analítica, agresiva, conservadora, fantasma, **JIT-Lucho** (comprar todo al rival cada
ronda), comprador-máximo caza-servicio. Criterio de aceptación: la analítica les gana a
todas por margen claro y el fantasma queda último. Regla de QA visual: todo número de
mock/pantalla sale de la fórmula final.

---

## 5. El taller (106 min + 14 de colchón)

| Reloj | Min | Bloque |
|---|---|---|
| 0:00 | 5' | Bienvenida + gancho ("¿fuiste a una tienda y no había? ¿volviste?") |
| 0:05 | 4' | Ingreso: un representante por mesa registra el equipo; el facilitador modera y cierra inscripciones |
| 0:09 | 4' | **Brief de Doña Peta** (proyectado + impreso en mesa) |
| 0:13 | 6' | **R0**: tour de la app + micro-reto de datos |
| 0:19 | 11' | **R1** — la primera compra ocurre antes del minuto 20 ✓ |
| 0:30 | 12' | **R2** — camión + afiche de la kermesse |
| 0:42 | 6' | **Corte** (en pantalla queda el afiche + el pico del histórico resaltado — la pausa es parte del juego) |
| 0:48 | 13' | **R3 kermesse** — clímax; su debrief es **intocable** |
| 1:01 | 12' | **R4** — el camión se plantó |
| 1:13 | 11' | **R5** — revelación final SIN ranking (se guarda) |
| 1:24 | 10' | **Debrief final**: 2 gráficos (caja por ronda · servicio vs. ganancia) + "del cuaderno al Excel" |
| 1:34 | 12' | **Premiación**: top 5 revelado en vivo, 2 premios + 2 automáticos |
| 1:46 | — | Fin · **colchón 14'** (si se gasta: recortar debrief R4 y exploración, NUNCA el debrief R3) |

**Materiales impresos** (el respaldo low-tech si el wifi muere): brief por mesa, **Hoja
del Analista por ronda (2 preguntas, respondibles en <2 min)**, tarjetas de rol
(*Analista de datos · Comprador · Contador · Vocero* — la mejor idea costo/beneficio del
diseño: evita que 1 juegue y 4 miren). La app muestra la pregunta guía de la ronda antes
del formulario de pedido.

**Momentos "aha" calibrados** (cada uno debe dolerle a ~5 equipos y salirle bien a ~5):
R1 *"adivinar y calcular no es lo mismo"* → R2 *"el promedio falla la mitad de las veces"*
→ R3 *"la información de hoy es el inventario de la próxima semana"* (comparar en
proyector al que anticipó vs. al que le compró caro a Lucho: *"los dos vieron el MISMO
afiche"*) → R4 *"tener mercadería no es tener plata"* → R5 *"no existe la decisión
perfecta: existe el equilibrio"*. Los 5 conceptos se nombran SIEMPRE después de vividos:
*"eso que les pasó se llama quiebre de stock"*.

Guion palabra por palabra, diccionario del analista y debrief de cierre: [anexo 01](./docs/design/01-pedagogia-narrativa.md)
(usando los números finales de §2/§4 — regenerar las hojas tras la calibración).

---

## 6. Producto / UX (mobile-first, celular gama media)

Wireframes completos en [anexo 04](./docs/design/04-ux-dashboards.md), con estos recortes del MVP:

- **Principio: un número grande por pantalla.** 5 pestañas: `Inicio` · `Tienda` ·
  `Pedido●` · `Datos` · `Podio`. Header fijo: `Semana 2/5 · ⏱ 04:10`.
- **Inicio:** **4 KPIs** (Caja · Ganancia · Caseros atendidos · Merma), semáforo = ícono +
  palabra (nunca solo color), umbrales definidos como % del capital inicial (sobreviven a
  la calibración). El "valor del estante" es una línea informativa en Tienda; el
  Valor/puesto vive en Podio. Tap en KPI → su gráfico.
- **Pedido:** steppers de 56px, impacto en caja EN VIVO ("te quedan Bs 441"), validación
  inline ("se compra por cajas de 6 — te faltan 2"), botón bloqueado si excede caja,
  editable hasta el cierre.
- **Resultado:** takeover con la ganancia (± grande) y **"el viaje de tu inventario"** —
  la ecuación vertical con pérdidas SIEMPRE en Bs ("7 caseros se fueron = Bs 21 que volaron").
- **Datos:** **4 presets de 1 clic** (*¿Cuánto se vende normalmente? · ¿Estoy pidiendo
  bien? · ¿Dónde está mi plata? · ¿Cuántas ventas perdí?*) + chips de producto. Línea o
  barras preseleccionado, histórico separado con "← hoy", "Ver tabla" siempre. Panel
  "Ver datos" desplegable simple dentro del Pedido (sin drag). Constructor libre → 2ª edición.
- **Onboarding:** entrar con el código de sala → crear nombre e integrantes → guardar
  código privado de recuperación → brief en 3 tarjetas → listo (<3 min). El servidor
  limita cupo, caracteres y nombres duplicados; el facilitador puede quitar equipos
  antes de R1 y cerrar o reabrir las inscripciones.
- **Facilitador:** grilla 4×5 con semáforo de envíos, timer con autocierre y tiempo
  editable antes o durante la ronda, demanda editable hasta revelar y **un solo botón primario**
  de fase. La carga manual de pedidos no forma parte del MVP: otro dispositivo debe
  recuperar con el código privado del equipo.
- **Proyección** (`/proyector`): MVP estático — timer gigante + "enviados 14/20" →
  demanda revelada → ranking. El drama lo pone la voz del facilitador contando desde el
  5º puesto. Animaciones → 2ª edición.
- **Estados feos** con microcopy exacto (anexo 04 §6), en especial *"Se cortó la señal —
  el borrador está guardado en este celular; vuelve a enviarlo al reconectar"*. El
  carrito local no se presenta como pedido confirmado ni como PWA offline.
- **Sistema visual:** paleta UPSA con roles estrictos; paleta de series validada contra
  daltonismo (veto al par verde/naranja adyacente); proyector ≥ 32px; targets ≥ 48px.

---

## 7. Arquitectura técnica

Detalle completo en [anexo 03](./docs/design/03-arquitectura.md), con estas correcciones
de la crítica. **Se conserva la cañería, se reescribe el dominio** (~30% del código
actual se reutiliza: clientes Supabase, http, ids, tokens, primitivas UI, y los patrones).

- **Esquema v2 (reducido):** públicas `sessions, rounds, teams, products, suppliers,
  supplier_offers, history_weeks, inventory_lots, inventory_moves, kpi_snapshots`;
  secretas `session_secrets (PIN 6 dígitos + rate limit en BD), team_secrets,
  round_plans (evento + supply_shock jsonb), demand_plan (NOT NULL — demanda vacía
  imposible), purchase_orders, order_submissions` (pedido y constancia de envío;
  secretas ex-ante, publicadas como movimientos al revelar).
  **Sin tablas de préstamos/crédito.** `rounds` gana **`closes_at`** (countdown en cliente,
  autocierre disparado por la pestaña del facilitador al llegar a 0 — sin cron).
  `teams` gana **`debt`** (fijos impagos). Realtime SOLO en
  `sessions/rounds/teams/kpi_snapshots`; el único trigger de recarga al revelar es el
  update de `rounds.status` → **1 evento = 1 refetch por cliente** (~25 en vez de ~2.000).
- **Motor (`engine.ts`):** función pura FEFO, sin I/O, con **vitest** — e implementa LA
  fórmula de §2 (no una propia). Tests obligatorios: llegadas por lead time, FEFO, merma
  exacta, deuda por fijos, caja ≠ ganancia, **"JIT-Lucho no supera a la analítica"**,
  **"fantasma queda último"**, demanda faltante lanza error.
- **Demanda:** guionada, horneada con ruido ±10% al crear la sesión (PRNG con semilla),
  editable por el facilitador hasta revelar (el patrón `round_secrets → update` ya existe
  en v1). Histórico: generador con la misma media (analizar la historia SÍ predice).
- **API:** create (siembra catálogo+ofertas+historia+plan en batch, crea los 20 equipos),
  join-por-código-de-equipo (reconexión por token, sin duplicados), orders (validación
  caja/cajas/tope, replace-all transaccional por ronda), open/close/extend y reveal.
  El reveal aplica pedidos, lotes, movimientos, KPIs, caja y estado final en una sola
  transacción SQL; el estado `revealed` se publica al final. Incluye
  facilitator/state y kick.
- **Defectos v1 corregidos como requisitos:** reconexión Realtime + polling de respaldo
  12s + refetch en `visibilitychange`/`online` (**F1, primero**); PIN 6 dígitos con
  bloqueo; sin duplicados; demanda vacía imposible; tormenta de reveal resuelta.
- **Gráficos:** Recharts (dynamic import en Datos) + sparklines SVG propias.
- **Capacidad:** ~25 conexiones vs. 200 del free tier: holgado. Riesgo real = pausa por
  inactividad → checklist D-1.

---

## 8. Roadmap (12 días-persona, red primero)

| Fase | Contenido | d-p |
|---|---|---|
| **F1** | **Hook de datos robusto**: reconexión + polling respaldo + visibilitychange — probado con 3 celulares reales bloqueando pantalla | 1,5 |
| **F2** | Schema v2 reducido + seed (catálogo, ofertas, historia, guion) + calibrador canónico `tools/calibrate.mjs` y lanzador `tools/sim.py` | 1,5 |
| **F3** | `engine.ts` FEFO + ≥12 tests vitest (incl. estrategias de ataque) | 2,0 |
| **F4** | `store/` + API v2 + rate-limit PIN + autorregistro transaccional de equipos | 2,0 |
| **F5** | UI equipo: 5 pestañas + trazabilidad + 4 presets de gráficos | 2,5 |
| **F6** | Panel facilitador + proyector estático | 1,5 |
| **F7** | **Ensayo general** (20 pestañas + celulares reales) + regenerar Hojas del Analista con números finales + guía del facilitador | 1,0 |
| | **Total MVP** | **12,0** |

**Recortes de emergencia** (en orden): proyector a una sola pantalla estática → un solo
preset de gráfico (demanda histórica) → fusionar cerrar+revelar en un botón → trazabilidad
en texto plano. **NUNCA recortar:** robustez de red, tests del motor, ensayo general — *un
bug de caja delante de 100 estudiantes es el único fallo del que no se vuelve.*

**Checklist del día D:** despertar Supabase + sesión completa de prueba el día anterior ·
ensayo 48h antes en el aula real · hotspot 4G del facilitador como wifi B · 1 ronda
jugable en papel si la app cae 10 min · QR + código impreso por mesa · regleta y 2
cargadores · el panel del facilitador se recupera desde cualquier dispositivo con code+PIN.

---

## 9. Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Wifi de aula + 20 celulares | F1 primero + borrador en localStorage + reconexión desde otro dispositivo con código privado + estados "sin conexión" diseñados |
| No cabe en 2 h | 106'+14' de colchón, autocierre duro, primera compra < min 20, recortes estándar definidos |
| Economía descalibrada / exploit no visto | sim con estrategias de ataque + criterio de aceptación (§4.5) |
| Supabase free tier pausado | Checklist D-1 |
| Complejidad para 17 años | 4 productos en R1, 1 concepto/ronda, 4 KPIs, presets de 1 clic, toda la complejidad vive en el motor |
| Un chico juega y 4 miran | Tarjetas de rol + Hoja del Analista (2 preguntas) |

---

## 10. Pendientes, preguntas y 2ª edición

**Calibración completada:** `npm run calibrate` usa el catálogo de seis productos,
la fórmula de §2 y estrategias analítica, agresiva, conservadora, fantasma,
JIT-Lucho y máximo servicio. El criterio automático exige que la estrategia
analítica gane y que el fantasma termine último. Caja inicial y precios quedan
fijados por la tabla de §2. Si cambia cualquier parámetro, la calibración, las
pruebas y los materiales deben regenerarse.

**Límite del MVP actual:** la aplicación publica el ranking principal con sus
desempates. Los premios secundarios de pronóstico, servicio y badges descritos en
§4.5 siguen siendo una propuesta de facilitación y todavía no se calculan en la UI.

**Preguntas al dueño del proyecto (no bloquean F1-F4):**
- ¿Fecha del evento? (12 d-p de MVP → define margen para la 2ª edición)
- ¿Celulares propios o máquinas de laboratorio?
- ¿Una sala de 20 equipos o una por laboratorio?
- ¿Premios físicos?

**Carpeta "2ª edición" (lista firmada — nadie la cuela de vuelta en el MVP):** catálogo de
13 productos ([anexo 05](./docs/design/05-economia-datasets.md)), 3º/4º proveedor, crédito
de proveedor, descuentos por volumen sistemáticos, fill-rate continuo, préstamo de la
cooperativa, piloto automático que repite órdenes, precios de venta ajustables, fiado,
constructor libre de gráficos, bottom sheet con drag, generador de nombres + logos,
animaciones de tómbola/podio, badges por ronda completos, noticias WhatsApp in-app,
certificado QR, PWA offline, "llamada a Doña Peta".

---

## Anexos

| Doc | Tipo | Contenido destacado |
|---|---|---|
| [01-pedagogia-narrativa](./docs/design/01-pedagogia-narrativa.md) | Diseño | Brief completo de Doña Peta, guion, Hojas del Analista, diccionario, debrief final |
| [02-mecanicas](./docs/design/02-mecanicas.md) | Diseño | Rondas al detalle, trazabilidad, eventos evaluados, análisis de ritmo |
| [03-arquitectura](./docs/design/03-arquitectura.md) | Diseño | DDL v2 completo, motor con pseudocódigo, API, riesgos técnicos |
| [04-ux-dashboards](./docs/design/04-ux-dashboards.md) | Diseño | Wireframes de todas las pantallas, presets de gráficos, paleta CVD, microcopy |
| [05-economia-datasets](./docs/design/05-economia-datasets.md) | Diseño | Catálogo extendido (13), demanda 5×13, simulación original del puntaje |
| [06-critica-simplicidad](./docs/design/06-critica-simplicidad.md) | Crítica | ¿Lo entiende un chico de 17? ¿Cabe en 2 h? |
| [07-critica-factibilidad](./docs/design/07-critica-factibilidad.md) | Crítica | MVP honesto, reuso del repo, plan del día D |
| [08-critica-balance](./docs/design/08-critica-balance.md) | Crítica | Exploits (JIT, normalización por cohorte), reglas de quiebra |

> El brief narrativo completo ("La Tiendita de Doña Peta") está en el §1 del anexo 01 y
> se conserva tal cual — solo se le actualizan los números con la tabla §2 de este plan.
