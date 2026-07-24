# DISEÑO DE MECÁNICAS — "STOCK PERFECTO 2.0: LA TIENDA DE BARRIO"
**Lente: game design de simulación seria | 5 rondas | ~20 equipos | dispositivo móvil por equipo | ~120 min**

> **Documento histórico anterior a la síntesis.** Conserva alternativas y cifras
> descartadas. La especificación vigente está en
> [`PLAN-V2.md`](../../PLAN-V2.md).

---

## 0. PARÁMETROS BASE DE LA ECONOMÍA (constantes del juego)

**Narrativa marco:** Doña Betty, dueña de la tienda "La Esquina" (barrio Los Chacos, Santa Cruz), viaja 5 semanas. Cada equipo es el **equipo de analistas de planificación** que administra las compras de su "sucursal". Cada ronda = 1 semana. Todos los equipos enfrentan la misma demanda (misma "esquina en universos paralelos"): la competencia es de decisiones, no de suerte.

**Supuestos declarados:** demanda pre-escrita (guionada, no aleatoria) e idéntica para los 20 equipos — garantiza equidad, control pedagógico y explicación simple del ranking. Taller de 120 min, un celular por equipo, facilitador con proyector.

### Catálogo de productos (precios en Bs, por unidad)

| Producto | Precio venta | Costo Don Lucho | Costo La Rapidita | Vida útil | Disponible desde | Rol pedagógico |
|---|---|---|---|---|---|---|
| Soda 2L "Cruceñita" | 12 | 8 | 10 | No vence | R1 | Caballo de batalla, margen depende del proveedor |
| Salteñas (unidad) | 7 | no vende | 4 | **1 semana** (lo no vendido se bota) | R1 | Newsvendor puro dentro del juego |
| Leche PIL 1L | 7 | 5 | 6 | **2 semanas** (FIFO por lote) | R2 | Perecedero con arrastre, gestión de lotes |
| Helado (unidad) | 6 | 3 | 4 | No vence (freezer) | R3 | Producto nuevo sin histórico, apuesta de feria |

### Proveedores

| | **Don Lucho** (mayorista) | **La Rapidita** (distribuidora en moto) |
|---|---|---|
| Precio | ~20% más barato | Lista completa, más caro |
| Lead time | **Llega la próxima semana** (inicio de ronda N+1) | **Llega hoy** (cuenta para la demanda de esta ronda) |
| Mínimo (MOQ) | 20 unidades por producto (si pides, pides ≥20) | Sin mínimo |
| Máximo | 120 unid/producto (tope anti-typo) | **40 unid/producto/semana** ("lo que entra en la moto") |
| Pago | Al pedir (la plata queda comprometida en tránsito) | Al pedir |
| Disponible | Desde R2; **bloqueado en R5** (ya no llegaría a tiempo) | Siempre |

### Finanzas

| Parámetro | Valor |
|---|---|
| Caja inicial | Bs 1.000 |
| Stock inicial heredado | 20 sodas (valuadas a Bs 8) |
| Costo fijo semanal (alquiler + luz) | **Bs 150** — se cobra siempre, incluso si no compras nada |
| Costo de bodega | Bs 0,50 por unidad que queda en estante al cierre de cada semana |
| Liquidación final (fin de R5) | Stock vigente al **50% del costo Lucho** (soda 4, leche 2,5, helado 1,5); vencido = Bs 0 |
| Puntaje | **Valor Total = Caja + liquidación del inventario** |

> El costo fijo de Bs 150 **mata el bug histórico**: no hacer nada ya no da ganancia 0, da pérdida de −150 por semana. Arriesgarse y equivocarse casi siempre supera a la inacción.

### Guion de demanda (oculto para los equipos; idéntico para todos)

| Producto | Prom. histórico | R1 | R2 | R3 (Feria) | R4 | R5 |
|---|---|---|---|---|---|---|
| Soda | 41 | 42 | 38 | **70** | 40 | 45 |
| Salteñas | 24 | 22 | 30 | **55** | 25 | 28 |
| Leche | 30 | — | 28 | **40** | 32 | 30 |
| Helado | sin datos | — | — | **60** | 15 (surazo) | 25 |

Chequeo de economía: un equipo bien jugado termina con Valor Total ≈ Bs 1.800–1.950 (margen bruto máximo teórico ≈ 1.740, fijos −750); un equipo errático, ≈ Bs 800–1.100. Spread suficiente para ranking claro sin quiebras masivas.

---

## 1. DISEÑO RONDA POR RONDA

La curva replica la escalada de la versión actual (intuición → datos → indicadores) pero en 360°: **R1 intuición con 1 proveedor → R2 datos + lead time → R3 pico anunciado → R4 crisis no anunciada → R5 cierre de horizonte.** Cada ronda introduce **exactamente una mecánica nueva** (regla de oro para 17 años).

### R0 — "Bienvenidos a La Esquina" (setup, 15 min)

- **Info que recibe el equipo:** brief narrativo (1 pantalla: quiénes son, qué ganan, cómo se puntúa), catálogo con precios, ficha de La Rapidita, **histórico de ventas de 6 semanas** de Doña Betty (soda: 38, 44, 40, 36, 45, 41 / salteñas: 24, 19, 26, 22, 28, 23), estado inicial (caja 1.000, 20 sodas).
- **Decisión/formulario:** nombre de equipo (máx. 20 caracteres) + pregunta de activación (no puntúa): *"Mirando el histórico, ¿cuántas sodas crees que se venderán esta semana?"* [número 0–99]. El facilitador muestra la nube de respuestas en el proyector — primer momento "somos analistas".
- **Concepto:** leer datos antes de decidir; un promedio es tu primer pronóstico.

### R1 — "La primera compra" (12 min)

- **Tema:** decidir con datos históricos y un solo proveedor.
- **Info nueva:** ninguna adicional al R0. Don Lucho aparece en gris: "atiende desde la semana 2".
- **Formulario:**

| Campo | Tipo | Límites |
|---|---|---|
| Soda — La Rapidita | entero | 0–40 |
| Salteñas — La Rapidita | entero | 0–40 |
| (resumen automático) | solo lectura | costo total, caja restante proyectada; **botón Enviar bloqueado si costo > caja** |

- **Evento:** ninguno (ronda de calibración).
- **Se revela al cerrar:** demanda (soda 42, salteñas 22), tarjeta de trazabilidad por producto (ver §2), primer ranking, primer punto del gráfico de Valor Total.
- **Concepto:** stock disponible = heredado + comprado; el perecedero que sobra se bota (*"cada salteña botada te costó Bs 4"*); el costo fijo corre siempre.

### R2 — "El mayorista y la noticia" (15 min) — la ronda más importante del juego

- **Tema:** velocidad vs precio; planificar para la próxima semana.
- **Info nueva:** (1) **Don Lucho desbloqueado** (ficha: 20% más barato, MOQ 20, "llega la próxima semana"); (2) **leche desbloqueada** con su histórico (29, 33, 27, 31, 30, 28) y vida de 2 semanas; (3) **AVISO en banner gigante:** *"Semana 3: FERIA DEL BARRIO. La demanda puede casi duplicarse. Podrás vender helados (sin histórico; en ferias otras tiendas venden 40–70). Doña Elvira horneará salteñas extra (tope sube a 60)."* (4) Promo de Lucho: soda a Bs 7 si pides 60+.
- **Formulario:**

| Campo | Límites | Nota en pantalla |
|---|---|---|
| Soda — Lucho / Rapidita | 0–120 (MOQ 20) / 0–40 | "Lucho llega la próxima semana" |
| Salteñas — Rapidita | 0–40 | "llega hoy" |
| Leche — Lucho / Rapidita | 0–120 (MOQ 20) / 0–40 | vence en 2 semanas |
| **Helado — Lucho (pre-pedido)** | 0–120 (MOQ 20) | "llega justo para la Feria" |

- **Evento:** el aviso de la Feria + promo por volumen (ambos anunciados).
- **Se revela:** demanda (soda 38, salteñas 30 — arriba del promedio: primera lección de variabilidad), y el estado "**en tránsito**" de los pedidos a Lucho.
- **Concepto:** lead time, MOQ, costo del apuro vs costo de planificar, pedir hoy para vender pasado mañana.

### R3 — "La Feria del Barrio" (15 min)

- **Tema:** pico de demanda anunciado; cosechar (o lamentar) lo pedido en R2.
- **Info nueva:** llegan los camiones de Lucho (los equipos ven su stock engordar en vivo); helado activo con venta a Bs 6; tope Rapidita de salteñas sube a 60 solo esta semana.
- **Formulario:** completo (4 productos × proveedores, mismos límites; recordatorio: "lo que pidas a Lucho llega en semana 4").
- **Evento:** **FERIA** (anunciada en R2). Demanda: soda 70, salteñas 55, leche 40, helado 60.
- **Se revela:** además de la trazabilidad, la línea **"ventas perdidas: X unidades = Bs Y que volaron"** en rojo — el quiebre de stock por primera vez duele en grande. Badge "Ojo Clínico" al mejor nivel de servicio de la feria.
- **Concepto:** pronóstico con señal anticipada; quiebre de stock = venta perdida invisible en la caja pero real en el bolsillo.

### R4 — "El camión se plantó" (14 min)

- **Tema:** riesgo de proveedor; replanificar bajo presión.
- **Info nueva (al abrir la ronda, SIN aviso previo):** *"El camión de Don Lucho se plantó en la carretera: llega solo el **50%** de tu pedido (redondeo hacia abajo). El resto se cancela y se te devuelve la plata."* Además, narrativa de clima: *"entró un surazo"* (explica la demanda baja de helado; sin mecánica extra).
- **Formulario:** completo. Lucho sigue disponible (con advertencia "¿le seguirás comprando?" — decisión con carga emocional real).
- **Evento:** falla de proveedor (no anunciada) — el reembolso hace la falla justa pero deja el hueco de stock; la Rapidita con tope 40 no alcanza para todo → hay que priorizar productos por margen.
- **Se revela:** demanda (soda 40, salteñas 25, leche 32, helado 15), mermas de leche comprada en R3 que venció, badge "Plan B" (mejor servicio pese a la falla).
- **Concepto:** stock de seguridad, dependencia de un solo proveedor, priorización por margen cuando el recurso es escaso.

### R5 — "Vuelve Doña Betty: la liquidación" (12 min)

- **Tema:** cerrar el horizonte sin quedarse con plata dormida en el estante.
- **Info nueva (anunciada al abrir):** *"Última semana. Al final, Doña Betty te compra el stock vigente a **mitad del costo**; lo vencido vale 0."* **Don Lucho bloqueado** en el formulario con la leyenda "sus entregas ya no llegarían a tiempo".
- **Formulario:** solo columna Rapidita (4 productos, 0–40 c/u).
- **Evento:** ninguno mecánico — la regla de liquidación ES el evento.
- **Se revela:** demanda (45 / 28 / 30 / 25), liquidación automática, KPIs finales, ranking definitivo con gráfico de las 5 semanas de los 3 finalistas en el proyector, premiación.
- **Concepto:** fin de horizonte: el inventario no es plata hasta que se vende; ganancia total ≠ ganar cada semana.

---

## 2. MECÁNICA DEL INVENTARIO QUE VIAJA

### Modelo
- El stock se guarda **por lotes**: (producto, cantidad, semana de vencimiento). Soda y helado: sin vencimiento. Salteñas: vencen al cierre de la misma semana. Leche: vence al cierre de la semana siguiente a la compra.
- Consumo **FIFO**: siempre se vende primero el lote más viejo (la app lo hace sola; al equipo solo se le muestra "8 leches vencen esta semana").
- Pedidos a Lucho viven en estado **"en tránsito"** (visibles en la app con un camioncito) y se materializan al abrir la siguiente ronda.
- El pago es al pedir: la caja refleja de inmediato el compromiso.

### ORDEN DE OPERACIONES EXACTO (motor de cierre)

**Apertura de ronda N (automática):**
1. Heredar caja y lotes de N−1.
2. **LLEGADAS:** recepcionar pedidos a Lucho hechos en N−1 (el evento de R4 los recorta al 50% y reembolsa la diferencia).
3. Publicar evento/avisos de la ronda.

**Fase de decisión (timer):**
4. Compras: validar MOQ, topes y caja; descontar caja; Rapidita entra al stock disponible de N; Lucho pasa a "en tránsito".

**Cierre de ronda (dispara el facilitador o el autocierre):**
5. **DEMANDA:** se revela la demanda guionada por producto.
6. **VENTAS:** vendido = min(stock disponible, demanda), consumiendo lotes FIFO; ingreso = vendido × precio; se registra `venta_perdida = demanda − vendido`.
7. **MERMAS:** se eliminan los lotes cuyo vencimiento = N; merma en Bs = unidades × costo pagado.
8. **COSTOS:** −150 fijos; −0,50 × unidades restantes (bodega); −interés de préstamo si hay.
9. **KPIs:** recalcular caja, valor total (caja + inventario al costo; en R5, a liquidación), nivel de servicio, merma acumulada, ganancia de la semana; actualizar ranking y gráficos.
10. Emitir la **tarjeta de trazabilidad** a cada equipo.

### Tarjeta de trazabilidad (lo que ve el equipo, 1 tarjeta por producto)

> **SODA — Semana 3**
> Tenías **12** → llegaron **40** (Don Lucho) + **20** (La Rapidita) = **72** disponibles
> Demanda: **70** → vendiste **70** (Bs 840) → perdiste **0** ventas
> Vencidas: **0** → te quedan **2** 🥤
>
> **LECHE — Semana 3**
> Tenías 2 (¡vencían hoy!) → llegaron 30 → 32 disponibles → demanda 40 → vendiste 32 → **perdiste 8 ventas (Bs 56)** → vencidas 0 → te quedan 0

Y debajo, la **cascada de caja** de la semana en una línea: `Caja 812 − compras 590 + ventas 1.394 − fijos 150 − bodega 6 = **Bs 1.460**`. Cuatro números por producto + una línea de caja: eso es todo lo que un chico de 17 necesita leer en 60 segundos, y es exactamente el ciclo contable de un inventario real.

---

## 3. EVENTOS: 8 CANDIDATOS, 4 FINALES

| # | Evento | ¿Avisado? | Enseña | Veredicto |
|---|---|---|---|---|
| 1 | **Feria del Barrio** (demanda ×~1,8, feriado con helados) | Sí, 1 semana antes | Pronóstico con señal anticipada; pedir con lead time | ✅ **FINAL — R3** |
| 2 | **El camión de Lucho se planta** (llega 50%, reembolso) | No | Stock de seguridad, doble fuente | ✅ **FINAL — R4** |
| 3 | **Promo por volumen** (soda Lucho a Bs 7 desde 60 unid.) | Sí | Descuento vs riesgo de sobrestock | ✅ **FINAL — R2** (liviano) |
| 4 | **Surazo** (helado se desploma post-feria) | No | Estacionalidad/clima | ✅ **FINAL — R4, solo narrativo** (ya está en el guion de demanda; cero reglas extra) |
| 5 | Corte de luz (pierdes 50% de refrigerados) | No | Riesgo operativo | ❌ Castigo aleatorio sin decisión que lo mitigue → frustra |
| 6 | Salteñas virales en TikTok (pico en 1 producto) | No | Volatilidad | 🔁 Reserva divertida si el grupo va rápido |
| 7 | Abre un minimarket (−15% soda permanente) | Sí | Competencia | ❌ Deprime la economía y el ánimo en un taller corto |
| 8 | Inflación anunciada (Lucho sube 10% la próxima semana) | Sí | Compra especulativa | ❌ Contradice la lección de liquidación de R5 |

**Regla de diseño:** un evento anunciado premia *leer*; uno no anunciado premia *haberse cubierto*. El juego necesita exactamente uno de cada tipo con peso mecánico (R3 y R4); el resto es condimento.

---

## 4. REGLA PARA EQUIPOS QUE NO ENVÍAN A TIEMPO: "PILOTO AUTOMÁTICO"

**Regla:** al llegar el timer a 0, todo equipo sin envío recibe una orden automática:
- **R1:** pedido conservador del sistema (soda 20, salteñas 15 a La Rapidita) — protege de tropiezos técnicos de la primera vez.
- **R2–R5:** se **repite su última orden enviada** (mismas cantidades y proveedores), recortada proporcionalmente si no alcanza la caja y ajustada a topes vigentes (p. ej., sin Lucho en R5).
- La ronda queda marcada **"AUTO"** en su historial y el equipo no es elegible para el badge de esa ronda. Sin multa monetaria adicional.

**Justificación:** (a) no premia la inacción — los Bs 150 fijos + bodega ya hacen que "no jugar" pierda plata, y una orden repetida es casi siempre subóptima frente a eventos (repetir la orden normal en la semana de feria es un castigo natural); (b) no destruye al equipo — comprar 0 forzado en la feria los sacaría emocionalmente del taller, que es el peor resultado pedagógico posible; (c) es explicable en una frase ("si no envías, la tienda repite tu último pedido"), y es exactamente lo que pasa en la vida real con órdenes recurrentes; (d) elimina el cuello de botella del ritmo: el facilitador cierra la ronda a tiempo **siempre**, sin negociar con rezagados.

---

## 5. MECÁNICAS OPCIONALES: EVALUACIÓN

| Mecánica | Valor pedagógico | Costo de complejidad | Veredicto |
|---|---|---|---|
| Ajustar precio de venta | Alto en teoría | **Muy alto**: exige modelo de elasticidad, rompe la demanda común a todos y la equidad del ranking | ❌ Excluir |
| Promociones propias | Medio | Alto (idem elasticidad) + campo extra en cada ronda | ❌ Excluir |
| Pedido exprés con recargo | Medio | Medio, pero **ya existe estructuralmente**: La Rapidita ES el canal exprés (caro, hoy) vs Lucho (barato, mañana) | ❌ No duplicar |
| Compartir/espiar entre equipos | Bajo | Medio; el ranking público en el proyector ya da la "inteligencia de mercado" suficiente | ❌ Excluir |
| **Préstamo de la cooperativa** | **Alto**: costo del capital + red de seguridad anti-quiebra (un equipo con caja 0 y sin stock queda muerto y desenganchado 3 rondas) | **Bajo**: 1 checkbox, 2 números | ✅ **INCLUIR** |
| Clima | Medio | Cero si es narrativo | ✅ Incluido gratis como surazo (evento 4) |

**Préstamo (versión final):** checkbox visible solo si caja < Bs 300: *"Pedir Bs 400 a la Cooperativa (interés Bs 40 por semana hasta el final)"*. Máximo 1 préstamo activo por equipo; capital + intereses se descuentan del Valor Total en la liquidación. Enseña que la plata ajena tiene precio, y salva el taller de tener equipos-zombis.

**Recomendación: incluir solo el préstamo.** Todo lo demás ya está representado dentro de la estructura de dos proveedores y eventos.

---

## 6. CONDICIONES DE VICTORIA

- **🏆 Gran Premio — "Tienda Perfecta":** mayor **Valor Total** final (caja + liquidación − deuda). Es la métrica que integra todo: comprar bien, no botar, no quebrar stock, no dormir plata.
- **Desempates (en orden):** 1) mayor nivel de servicio acumulado (unidades vendidas ÷ unidades demandadas de las 5 semanas); 2) menor merma acumulada en Bs; 3) mayor ganancia en R5.
- **🥈 Segundo premio — "Servicio 5 Estrellas":** mayor nivel de servicio acumulado, **elegible solo si su Valor Total ≥ Bs 1.000** (candado anti-"compro infinito para nunca quebrar stock": la liquidación al 50% ya lo castiga, el candado lo remata). Premia al equipo obsesionado con el cliente aunque no gane en plata — segunda identidad de analista posible.
- **Badges por ronda (sin puntos, solo proyector y aplausos):** R1 "Primera Venta" (mayor ganancia semanal), R3 "Ojo Clínico" (mejor servicio en la feria), R4 "Plan B" (mejor servicio pese a la falla), R5 "Aterrizaje Perfecto" (servicio ≥ 90% con menor stock sobrante). Mantienen viva la esperanza de los equipos que van abajo en el acumulado.

---

## 7. ANÁLISIS DE RITMO (los 4 lugares donde muere un taller, y su antídoto)

### Presupuesto de tiempo (120 min)

| Bloque | Min | Bloque | Min |
|---|---|---|---|
| Brief + registro (R0) | 15 | R4 | 14 |
| R1 | 12 | R5 + liquidación | 12 |
| R2 | 15 | Premiación + debrief | 15 |
| R3 | 15 | **Buffer real** | **22** |

Anatomía de cada ronda: 2–3 min apertura/evento (facilitador) + **5 min de decisión con timer** + 3–4 min de cierre con **una sola pregunta guía** en pantalla (R1: "¿cuánto te costó cada salteña que botaste?"; R2: "¿qué es más caro: el apuro o la espera?"; R3: "¿cuánta plata voló en ventas perdidas?"; R4: "¿de cuántos proveedores depende tu negocio?"; R5: "¿de qué sirve un estante lleno el último día?").

### Riesgos y mecánicas anti-muerte

| Riesgo | Antídoto mecánico |
|---|---|
| Esperar al último equipo (el asesino #1) | **Timer server-side visible en proyector y celulares + autocierre duro + piloto automático** (§4). La ronda cierra a la hora, siempre. Contador público "14/20 equipos listos" — la presión social hace el resto |
| Facilitador que se alarga explicando | Cada regla nueva vive en **una tarjeta in-app de máx. 3 líneas**; el proyector solo muestra el evento y la pregunta guía. Una mecánica nueva por ronda, nunca dos |
| Parálisis por cálculo en el formulario | **Calculadora incorporada**: el form muestra en vivo costo total, caja restante y stock proyectado ("tendrás 62 sodas para vender hoy"). Nadie saca papel |
| Lectura de resultados confusa | Tarjeta de trazabilidad de 4 números (§2); el facilitador comenta solo 3 cosas: el mejor movimiento, el error más caro y el cambio en el top 3 |
| Equipos hundidos que se desconectan | Préstamo (§5) + badges por ronda (§6) + segundo premio: siempre hay algo que ganar en la próxima ronda |
| Derrape de agenda | El buffer de 22 min se gasta en R2/R3 (las rondas cognitivamente pesadas); botón de facilitador "+60 s" usable máx. 1 vez por ronda; si el reloj aprieta, R5 puede cerrarse en 8 min sin perder la lección (el form es de 4 campos) |
| Celulares/red fallan en R1 | El default conservador de R1 (§4) evita que un problema técnico destruya a un equipo en su primer contacto con el juego |

**Regla de oro de ritmo:** el juego nunca espera a un equipo; un equipo siempre puede reengancharse al juego. Esas dos frases resumen el piloto automático, el préstamo y los badges — y son la diferencia entre un taller de 2 horas que vuela y uno que se arrastra.
