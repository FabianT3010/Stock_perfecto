# Crítica: balance y exploits (min-maxer adversarial)

> Crítica adversarial generada sobre los 5 diseños fuente (anexos 01-05), ANTES de la síntesis.
> Las decisiones finales que absorben o descartan cada hallazgo están en PLAN-V2.md.

## Resumen

Las cuatro propuestas cierran bien el bug histórico del "fantasma" (costos fijos + inventario que viaja lo mandan último en 3 de 4 diseños, verificado con sus propios números), pero el sistema multi-KPI de Economía es explotable: un jugador reactivo que compra todo a Toñito Exprés justo cuando lo necesita satura Servicio, Salud y hasta el premio de "mejor pronóstico" (55/55 puntos sin analizar nada, ~76/100 total) porque los 13 productos siguen dejando margen al 115%. La normalización min-max contra la cohorte (Economía y, peor, el motor técnico que la aplica por ronda y con una fórmula distinta a todas las demás) hace que el peor equipo de la sala mueva el ranking ajeno hasta 5 puntos y que rondas planas amplifiquen diferencias de Bs 10 en 25 puntos. El guion determinista y anunciado de Mecánicas deja el juego resuelto tras la ronda 2 (empates masivos decididos por desempates) y su crisis estrella de R4 cuesta como máximo Bs 127. Además, las cuatro propuestas traen cuatro economías y cuatro fórmulas de puntaje incompatibles, la quiebra sigue indefinida en dos de ellas, y el puntaje de UX resta la merma dos veces. Nada de esto exige rediseño: son ~8 ajustes de parámetros y reglas, pero el sintetizador debe elegir una sola economía y re-simular con estrategias de ataque, no solo con arquetipos amables.

## Problemas

### 🔴 ALTA — Exploit JIT con Toñito Exprés (Economía): 55/55 puntos de S+H+A sin pronosticar nada

Toñito vende al 115% del costo de referencia y con ese recargo TODOS los 13 productos siguen dejando margen positivo (pan 0,80−0,575=+0,225; leche 7,5−6,9=+0,6; gaseosa 15−12,65=+2,35; papel 16−13,8=+2,2; etc.). Como además no tiene MOQ, entrega inmediata e incluso 'a mitad de ronda ante quiebre' con fill 100%, la estrategia degenerada es: no comprar nada por adelantado y rescatar exactamente lo demandado. Resultado: S=25/25 (servicio 100%), H=20/20 (cero merma y cero almacenaje porque cierra cada ronda con estante vacío), A=10/10 (disponible=demanda ⇒ MAPE=0... ¡el premio 'Ojo del Analista' y el premio 'Mejor pronóstico' se los lleva quien NO pronostica!). Su utilidad: margen semanal a precios Toñito ≈ 4.296−1,15×3.146 = Bs 678 vs 1.435 con Don Beto; U≈2.800-2.900 en 5 rondas ⇒ G≈21 ⇒ TOTAL≈76/100, cómodamente arriba de la Conservadora (59,9) de la propia simulación. Media tabla garantizada con cero análisis, y la simulación de verificación nunca probó esta estrategia (solo probó 3 arquetipos amables comprando todos en Don Beto).

**Solución propuesta:** Tres ajustes: (1) subir Toñito a 130% del costo de referencia — con eso leche (7,8>7,5), yogurt, salchicha, arroz (9,75>9,5) y aceite (16,9>16) pasan a margen NEGATIVO y el rescate solo es rentable en bebidas/snacks; (2) tope de compra a Toñito de Bs 300 por ronda o 20% de la demanda; (3) calcular el MAPE del componente A sobre el disponible AL INICIO de la ronda (stock + llegadas planificadas), excluyendo rescates de mitad de ronda. Re-simular con 'JIT-Toñito' como estrategia de ataque obligatoria en el QA.

### 🔴 ALTA — Normalización min-max contra la cohorte: el peor equipo controla el puntaje de todos (Economía y motor técnico)

G = 45×(U−Umin)/(Umax−Umin) depende de los extremos de la sala. Con los propios números de la propuesta: si existe un fantasma (Umin=−580), la Agresiva saca G=39,8; si el peor equipo real es la Conservadora (U=3.001), la misma Agresiva con la misma utilidad saca 45×(5.910−3.001)/(6.758−3.001)=34,8. Un swing de 5 puntos — más que la brecha 1º-2º simulada (8,1) partida al medio — decidido por un tercero. Es manipulable (un equipo que se hunde a propósito, o al que echan, cambia el ranking ajeno) e inestable. El motor técnico lo agrava: normaliza min-max POR RONDA y SUMA: en una ronda plana donde todos ganan entre Bs 95 y 105, el de 95 pierde 25 puntos de score (0,5×50) por una diferencia de Bs 10 — el ruido decide más que la decisión (caso d).

**Solución propuesta:** Normalizar contra ancla FIJA precalculada, no contra la cohorte: G = 45×clamp(U/U_objetivo, 0, 1) con U_objetivo = Bs 6.000 (la utilidad de la estrategia analítica de referencia), calculado UNA sola vez al final. Determinista, inmune a trolls, comparable entre sesiones, y el proyector puede mostrar 'te faltan X Bs para el puntaje pleno'.

### 🔴 ALTA — Motor técnico: tercera fórmula de puntaje incompatible, inventario no vendido casi gratis y sin liquidación final

engine.ts implementa scoreWeights {profit 0.5, service 0.3, waste 0.2} por ronda y acumula — no coincide con NINGUNA de las otras tres fórmulas propuestas. Exploits propios: (1) el profit del motor es revenue−cogs−merma−holding−fijo, o sea el stock comprado y no vendido NO penaliza el puntaje (solo holding de Bs 0,20/u/ronda = 2,7% del costo de un detergente de 7,5): acaparar 500 refrescos cuesta apenas Bs 100/ronda de score y no existe liquidación final que cobre la plata dormida; (2) wasteRatio con available=0 da 0 ⇒ el equipo fantasma cobra 20 pts/ronda gratis del componente waste (≈100 pts acumulados por no tener nada); (3) comprar masivamente al proveedor Express (lead 0, refresco a 12 vs venta 13) cada ronda da servicio 100% + waste 100% sin pronóstico — el mismo exploit JIT de Toñito replicado en el seed técnico.

**Solución propuesta:** El motor debe implementar la fórmula que elija el sintetizador, no una propia: puntaje sobre utilidad ACUMULADA con liquidación final al 50% del costo (como Mecánicas/Economía), normalizada una sola vez al final contra ancla fija. wasteRatio con available=0 debe devolver el peor valor entre los que tuvieron actividad, no 0. Test de vitest obligatorio: 'estrategia Express-JIT no supera a la analítica' y 'fantasma queda último'.

### 🔴 ALTA — Cuatro economías y cuatro fórmulas de puntaje incompatibles entre propuestas

Capital inicial: 1.500 (Pedagogía) / 2.000 (Economía) / 1.000 (Mecánicas y UX) / 800 (Técnico). Catálogo: 6 / 13 / 4 / 5-6 productos. Proveedores: 3 / 4 / 2 / 3, con nombres reciclados en roles opuestos ('La Ramada' es mercado inmediato en Pedagogía y mayorista lead-1 en Técnico/UX; 'Don Lucho' es el villano caro en Pedagogía y el mayorista barato en Mecánicas). Puntajes: caja+inv/2+5×servicio / G+S+H+A sobre 100 / solo Valor Total / ganancia+3×servicio−merma. Todo balance verificado en una propuesta es inválido en las otras: los umbrales de semáforo de UX están calibrados a Bs 1.000, la simulación anti-exploit de Economía a Bs 2.000 con fijos de 200, y el motor técnico cobra fijos de 60. Cualquier mezcla ingenua reintroduce los exploits que cada una creía cerrados (p.ej. fijos de 60 con la escala de ventas de Economía ≈ 1,4% del margen semanal: el fantasma vuelve a ser casi gratis).

**Solución propuesta:** El sintetizador debe congelar UNA economía canónica (sugerido: la de Economía como base numérica por ser la única con simulación, podada a 8 productos para caber en 7 minutos de decisión) y UNA fórmula de puntaje, y re-derivar de ahí umbrales de UX, seed técnico y hojas pedagógicas. Regla dura: ningún número de balance vive en dos documentos; una sola tabla fuente de verdad.

### 🔴 ALTA — Mecánicas: juego resuelto tras R2 (demanda determinista + eventos anunciados con magnitud) y crisis de R4 que no muerde

La demanda es guionada, idéntica y los eventos se anuncian con magnitud casi exacta ('puede casi duplicarse', 'otras tiendas venden 40–70 helados'). La estrategia obvia — pedir promedio histórico en semanas normales y ~1,8× cuando lo anuncian — es dominante y computable por cualquier equipo atento: los 10-15 equipos que la sigan terminan separados por menos de Bs 50 sobre un spread total de ~1.000, y el podio lo deciden los desempates, no las decisiones. Peor: la única sorpresa (camión al 50% en R4, con reembolso) es inofensiva porque La Rapidita cubre el 100% de la demanda de R4 dentro de su tope de 40 (soda 40≤40, salteñas 25, leche 32, helado 15); el costo máximo de haber ignorado el stock de seguridad es el sobreprecio: 40×2 + 32×1 + 15×1 = Bs 127, un 13% del spread — la lección estrella de R4 cuesta menos que una mala compra de salteñas.

**Solución propuesta:** (1) Adoptar el ruido de Economía: demanda = guion × (1+ε), ε~U(−10%,+10%) sorteado por producto-ronda IGUAL para los 20 equipos (mantiene la equidad, rompe la resolubilidad exacta y los empates). (2) Anuncios en rangos vagos ('entre 1,5× y 2,5×'). (3) En R4 bajar el tope de La Rapidita a 25 u/producto: con soda demanda 40, el que no tenía colchón pierde 15 ventas × Bs 4 de margen + servicio — ahora la lección cuesta ~Bs 200 y se siente.

### 🟠 MEDIA — Componente H 'Salud de inventario' (20/100 pts) no discrimina nada y premia al minimalista (Economía)

Con los números de la propia simulación: Conservadora H=20,0, Analítica 19,8, Agresiva 19,4 — 0,6 puntos de spread entre las estrategias más opuestas del juego, porque (merma+almacenaje)/compras da 0%, 0,9% y 2,9% respectivamente y la fórmula es lineal desde 1. Es un quinto del puntaje que funciona como constante, salvo para regalarle 20 pts plenos a quien compra casi nada (la Conservadora, que ignora el juego, lo maxea). En la práctica el juego se decide en 80 puntos, no en 100, y el peso relativo real de S y A sube sin que nadie lo haya decidido.

**Solución propuesta:** Reemplazar por una curva con dientes: H = 20×max(0, 1 − 5×(merma+almacenaje)/compras) — así 4% de desperdicio cuesta 4 pts y no 0,8 — y añadir piso de actividad: H=0 si compras < 50% de la demanda acumulada en Bs (mata el maxeo por inanición). Alternativa más simple: bajar H a 10 pts y devolver esos 10 a G.

### 🟠 MEDIA — Quiebra indefinida (g): fijos con caja insuficiente, crédito de R5 sin cobro posible, y caja negativa sin rescate en el motor técnico

Economía: la regla 'caja nunca negativa' solo cubre PEDIDOS; no dice qué pasa cuando los fijos de Bs 200 llegan con caja de Bs 50, ni cómo se cobra el crédito de La Principal tomado en R5 (se paga 'la ronda siguiente'… que no existe; y su mercadería lead-1 tampoco llega nunca — pedido fantasma con plata comprometida indefinida). Motor técnico: cashEnd = cashStart + revenue − compras − holding − fijos puede ser negativo, no hay préstamo en el schema ni en el engine (la mecánica de la Cooperativa de la propuesta de Mecánicas no está implementada), y un equipo con caja ≤ 0 no puede pedir nada ⇒ zombie mirando el techo las últimas 2-3 rondas (~40 min). Solo Mecánicas resuelve (g) completo con préstamo + piloto automático + badges.

**Solución propuesta:** Tres reglas escritas: (1) los fijos SÍ pueden dejar caja negativa y ese saldo es deuda que se descuenta del puntaje/liquidación (nunca bloquea seguir jugando); (2) La Principal bloqueada en R5 (como Mecánicas bloquea a Lucho: 'ya no llegaría a tiempo') y toda deuda viva se descuenta en la liquidación; (3) portar el préstamo de la Cooperativa (Bs 400, interés fijo, visible solo con caja < 300) al schema y al engine — es la única red anti-zombi de las cuatro propuestas.

### 🟠 MEDIA — UX: merma contada DOS veces en el puntaje — los perecederos se vuelven radiactivos

En la propuesta UX, Ganancia acumulada = ventas − costo de lo vendido − merma (KPI 2), y el Puntaje = ganancia + 3×servicio − merma vuelve a restarla. Cada Bs de merma cuesta 2 puntos mientras cada Bs de ganancia da 1: una leche vencida (costo 5,5) borra la ganancia de 7,3 leches vendidas (margen 1,5). La jugada racional es casi abandonar pan/leche/yogurt y comerse la pérdida de servicio (3 pts por punto porcentual): dejar de vender pan (~35% de las unidades) cuesta ~105 pts de servicio contra ~155 de margen potencial CON riesgo doble de merma — el perecedero queda al borde de ser jugada dominada, matando la mitad del contenido pedagógico. Evidencia de que nadie corrió los números: el propio mock es inconsistente, 118 + 3×87 − 12 = 367, no los 379 mostrados.

**Solución propuesta:** Restar la merma UNA sola vez (dentro de ganancia, donde ya está) y compensar subiendo el peso de servicio a 5×. Corregir el mock. Regla de QA para el sintetizador: todo número de pantalla de ejemplo debe salir de la fórmula final, no inventarse.

### 🟠 MEDIA — Pedagogía (f): el mercado La Ramada domina ESTRICTAMENTE al camión en arroz y aceite

Arroz: mercado 5,0 vs distribuidor 5,5. Aceite: mercado 10,0 vs distribuidor 10,5. El mercado es más barato Y entrega hoy Y sin lead time; el taxi de Bs 20 es por viaje y se comparte con la compra semanal de perecederos que igual vas a hacer (costo marginal ≈ 0). Además el camión ni siquiera lista MOQ de arroz en su tabla de cajas. Resultado: en 2 de 6 productos la decisión 'planificar con lead time vs improvisar' — el corazón del juego — no existe: el camión queda solo para Coca/Leche/Yogurt/Snacks y la Hoja del Analista hace preguntas sobre un trade-off que el alumno vivo descubre que es falso.

**Solución propuesta:** Regla de pricing global: el proveedor lento SIEMPRE ≥5% más barato que el rápido en todo producto que ambos vendan. Concreto: arroz mercado 5,8 (distribuidor 5,5), aceite mercado 11,0 (distribuidor 10,5); o quitar arroz y aceite del camión y narrarlo ('EMBOL/PIL/Fino no distribuyen abarrotes').

### 🟠 MEDIA — Piloto automático (Mecánicas): el equipo ausente empata con los que jugaron mal

Repetir la última orden enviada deja al equipo que envió UNA orden decente en R1 y se desconectó en: soda 25×margen 2 + salteñas 22×3 = Bs 116/semana − 150 fijos ≈ −35/semana ⇒ termina en ~Bs 850–950 de Valor Total. El rango declarado del 'equipo errático' es Bs 800–1.100: el ausente queda DENTRO del rango de quienes decidieron mal las 5 rondas. Caso (b) verificado: jugar mínimo (1 orden en 60 minutos) rinde igual que jugar mal activamente, y en la premiación puede quedar por encima de 3-4 equipos que sí intentaron.

**Solución propuesta:** Decaimiento del piloto: cada ronda AUTO repite la orden con −20% de cantidades (redondeo abajo) — 2 rondas ausente ⇒ 64% del pedido, sangría creciente y realista ('la tienda sin dueño se apaga'). Mantener la excepción amable de R1. Añadir a los desempates: menos rondas AUTO gana.

### 🟡 BAJA — Premios secundarios capturables ignorando el juego (Economía y Mecánicas)

'Cero merma' (Economía) lo gana automáticamente quien jamás stockea un perecedero — la Conservadora de su propia simulación (merma Bs 0, servicio 50,3%) se lo lleva por rendirse. 'Mejor pronóstico' (menor MAPE) se lo lleva el JIT-Toñito que no pronostica (problema 1). 'Servicio 5 Estrellas' (Mecánicas) exige Valor ≥ Bs 1.000: comprar el máximo de todo por Rapidita cada semana da servicio ~100% con margen semanal ≈ +204 − 150 fijos − 40/70 de merma de salteñas ≈ ±0, o sea Valor final ≈ 1.000±100 — el candado está exactamente donde aterriza el comprador compulsivo sin pensar, moneda al aire.

**Solución propuesta:** Piso de servicio ≥ 90% para 'Cero merma' y 'Mejor pronóstico'; subir el candado de 'Servicio 5 Estrellas' a Valor ≥ Bs 1.300 (≈ punto medio entre errático alto y bien jugado) para que exija servicio Y gestión.

### 🟡 BAJA — Helado (Mecánicas): apuesta sin downside real

No vence (freezer), markup 100% (costo Lucho 3, venta 6), demanda pre-anunciada '40–70' y guionada en 60+15+25=100. Pedir el máximo razonable (~110) en R2 cuesta Bs 330 y solo la Feria devuelve 60×6=360: recupera el capital en una ronda, y el resto (R4+R5 = 40 ventas = Bs 240) es ganancia con único costo la bodega (~20×0,5×2 = Bs 20) y salvage 1,5 por sobrante. Es la mejor inversión por Bs del juego sin necesidad de análisis: el 'producto apuesta' es en realidad el producto seguro.

**Solución propuesta:** Darle downside: el helado pierde 25% de unidades por ronda almacenada ('el freezer de Doña Betty es viejo') o liquidación final a Bs 0 ('nadie compra helado al por mayor en invierno'). Con eso sobrepedir 40 unidades cuesta Bs 90-120 reales y el rango anunciado 40–70 vuelve a ser una apuesta.

### 🟡 BAJA — Recorte proporcional de pedidos que exceden caja rompe MOQ y bultos (Economía)

La regla anti-sobregiro 'el pedido se recorta proporcionalmente' puede producir cantidades que violan los bultos de Don Beto (huevo ×30, gaseosa ×6…) y los mínimos de pedido (Bs 300/400): un pedido de 60 gaseosas recortado al 73% son 43,8 unidades — ni entero, ni múltiplo de 6, ni auditable en vivo por el facilitador. En un taller donde la trazabilidad ('los números no mienten') es el lema, el motor generaría números imposibles de reconstruir a mano.

**Solución propuesta:** Recortar por LÍNEAS enteras en orden de menor margen unitario hasta que el pedido quepa (determinista, auditable, y de paso enseña priorización por margen), con preview en la UI antes de enviar: 'no te alcanza: se caería primero el detergente'.

## Recomendaciones

- Congelar UNA economía canónica y UNA fórmula de puntaje antes de escribir una línea más de código: base sugerida la de Economía (única con simulación), podada a ~8 productos, y que el motor técnico implemente ESA fórmula — hoy el engine trae una tercera fórmula propia (50/30/20 por ronda) que nadie diseñó ni balanceó.
- Cambiar toda normalización min-max de cohorte por anclas fijas (G = 45×clamp(U/6.000, 0, 1), calculado una vez al final): elimina la manipulación por el peor equipo, los swings de 5+ puntos por factores ajenos y la amplificación de ruido del cálculo por-ronda.
- Nerfear el canal exprés en las dos variantes donde existe: Toñito a 130% del costo (deja 5 productos con margen negativo) + tope Bs 300/ronda, y en el seed técnico subir Express para que al menos refresco/leche pierdan plata; computar el MAPE del componente A sobre el disponible al inicio de ronda. Sin esto, el JIT reactivo garantiza media tabla y el premio de 'mejor pronóstico' sin pronosticar.
- Re-simular con estrategias de ATAQUE, no solo arquetipos amables: JIT-Toñito, comprador-máximo caza-premio-de-servicio, minimalista caza-H, y ausente-con-piloto-automático. Criterio de aceptación: la analítica les gana a TODAS por ≥10 puntos y el orden fantasma < errático < mínimo viable < analítica se preserva.
- Si se usa el guion de Mecánicas, añadirle el ruido de Economía (±10% idéntico para los 20 equipos), anunciar eventos en rangos vagos y bajar el tope de La Rapidita en R4 a 25 u/producto — hoy el juego es resoluble por fórmula tras R2 (empates masivos arriba) y la crisis de R4 cuesta máximo Bs 127.
- Escribir las tres reglas de quiebra que hoy no existen: fijos impagos = deuda que descuenta puntaje (nunca bloquea jugar), proveedor lento y crédito bloqueados en R5 con deuda viva descontada en liquidación, y préstamo de la Cooperativa portado al schema/engine como red anti-zombi.
- Corregir la doble resta de merma en el puntaje de UX (restar solo dentro de ganancia, subir servicio a 5×) y recalcular todos los umbrales de semáforo y mocks contra la fórmula final — el mock actual ni siquiera cuadra (367 ≠ 379).
- Repricing de dominancia en Pedagogía: el proveedor lento siempre ≥5% más barato que el rápido en todo producto compartido (arroz mercado 5,8, aceite 11,0), o sacar esos productos del camión; y definir el % de servicio como ponderado por unidades, con costo fijo de Bs 100/ronda para que la fórmula no sea mono-KPI de caja.
