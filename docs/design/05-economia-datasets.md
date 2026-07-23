# ECONOMÍA DEL JUEGO Y DATASETS — "Stock Perfecto v2: La Tienda del Barrio"

**Supuestos declarados:** ronda = 1 semana de la tienda; taller de ~2 h con 20 equipos; todas las cifras en bolivianos (Bs), precios de calle Santa Cruz 2026 (post-inflación 2024-2025, redondeados para jugabilidad); la realización de demanda es **idéntica para los 20 equipos** en cada ronda (competencia justa: gana quien planifica mejor, no quien tuvo suerte); las compras se deciden al inicio de la ronda y la venta ocurre dentro de la misma ronda.

---

## 1. CATÁLOGO — 13 productos de tienda de barrio (Santa Cruz)

El "costo unitario" es el **precio de lista de la Distribuidora oficial** (costo de referencia = 100%). Margen calculado sobre costo. **Decisión: NO incluir cerveza** — el público son menores de edad (17-18) en un evento universitario; su rol pedagógico (producto de alto margen con pico por evento) lo cumplen la gaseosa, el agua y la salchicha en las rondas de calor/clásico/kermesse, sin riesgo reputacional para UPSA.

| # | Producto | Categoría | Costo (Bs) | PV (Bs) | Margen s/costo | Perecibilidad | Rotación | Característica que afecta la decisión |
|---|---|---|---|---|---|---|---|---|
| 1 | Pan de batalla (unidad) | Panificados | 0.50 | 0.80 | 60% | **1 ronda** (se vence el mismo día) | Alta | Ancla de tráfico: alto volumen, todo sobrante es merma total |
| 2 | Huevo (unidad) | Frescos | 0.90 | 1.20 | 33% | 3 rondas | Alta | Se compra por maple de 30 en el mayorista |
| 3 | Leche PIL bolsa 946 ml | Lácteos | 6.00 | 7.50 | 25% | **2 rondas** | Alta | Margen bajo pero "trae clientes"; requiere frío |
| 4 | Yogurt bebible PIL 1 L | Lácteos | 11.00 | 14.00 | 27% | **2 rondas** | Media | Perecible caro: el error cuesta Bs 11 por unidad |
| 5 | Salchicha Sofía paq. x8 | Embutidos | 14.00 | 18.00 | 29% | **2 rondas** | Media | Pico fuerte con parrillada/kermesse (choripán) |
| 6 | Gaseosa 2 L (Coca-Cola) | Bebidas | 11.00 | 15.00 | 36% | No perece | Alta | Muy sensible a calor y eventos sociales |
| 7 | Agua 600 ml (Vital) | Bebidas | 2.50 | 4.00 | 60% | No perece | Media | El producto más sensible al calor (×1.8) |
| 8 | Galletas paquete (Mabel's) | Snacks | 2.00 | 3.00 | 50% | No perece | Alta | Compra impulsiva de escolares |
| 9 | Snack bolsita (chizitos) | Snacks | 1.50 | 2.50 | 67% | No perece | Alta | Mayor margen % del catálogo; pico con eventos |
| 10 | Arroz Grano de Oro 1 kg | Abarrotes | 7.50 | 9.50 | 27% | No perece | Media | Voluminoso: castiga el costo de almacenaje |
| 11 | Aceite Fino 900 ml | Abarrotes | 13.00 | 16.00 | 23% | No perece | Media | Sensible a **rumor de escasez** (acaparamiento, R4) |
| 12 | Papel higiénico paq. x4 | Limpieza | 12.00 | 16.00 | 33% | No perece | Baja | Compra planeada: pico en quincena |
| 13 | Detergente bolsa 350 g (Omo) | Limpieza | 8.00 | 11.00 | 38% | No perece | Baja | Pico en quincena; rotación lenta = caja atrapada |

**Chequeo de escala:** cubrir una semana base cuesta **Bs 3,146 al costo** y genera **Bs 4,296 de venta** (margen bruto potencial ≈ Bs 1,150/semana). Estos totales calibran capital, crédito y costos fijos (secciones 4 y 6).

*Nota de jugabilidad:* 13 productos × 5 rondas es manejable si la UI precarga el pedido sugerido en 0 y muestra el histórico al lado de cada casilla. Si el facilitador quiere simplificar la ronda 1, puede activar solo los productos 1-8 y liberar abarrotes/limpieza desde la ronda 2 (el dataset lo soporta sin cambios).

---

## 2. PROVEEDORES — 4 arquetipos con trade-offs enseñables

**Decisión sobre contrabando:** NO incluir un proveedor de contrabando con nombre propio (no romantizarlo ante menores en un evento institucional). La informalidad real del retail boliviano se captura con el **mayorista del Abasto**: barato, al contado, con quiebres de stock y bultos grandes.

| Condición | **"La Principal"** (Distribuidora oficial) | **"Don Beto"** (Mayorista Mcdo. Abasto) | **"San Jorge"** (Panadería-granja del barrio) | **"Toñito Exprés"** (el primo con moto) |
|---|---|---|---|---|
| Productos | Todo el catálogo **excepto** pan y huevo | Todo **excepto** pan (huevo sí, por maple) | Solo **pan y huevo** | Todo el catálogo |
| Precio vs. referencia | **100%** | **90%** (+ flete fijo **Bs 30** por pedido) | 100% | **115%** |
| Pedido mínimo | Bs 300 por pedido | Bs 400 por pedido, **en bultos** (ver abajo) | 20 panes / 30 huevos | Ninguno |
| Lead time | **Llega la SIGUIENTE ronda** | **Inmediato** (misma ronda) | Inmediato | Inmediato, incluso **a mitad de ronda** (rescate ante quiebre) |
| Descuento por volumen | 5% si pedido ≥ Bs 800; **10% si ≥ Bs 1,500** | 3% si pedido ≥ Bs 1,200 | No | No |
| Crédito | **Sí: hasta Bs 1,000, se paga la ronda siguiente** | No (contado) | No | No |
| Confiabilidad (fill rate) | 98% | **85%** (entrega 80-100% de lo pedido; en R4 el aceite cae a 50%) | 100% | 100% |

**Bultos de Don Beto** (los pedidos se redondean a múltiplos): huevo ×30 (maple), leche ×10, yogurt ×6, salchicha ×10, gaseosa ×6, agua ×12, galletas ×20, snack ×24, arroz ×10, aceite ×12, papel ×8, detergente ×12.

**Los tres trade-offs que el juego enseña:**
1. **Barato-pero-arriesgado (Don Beto):** ahorras 10%, pero pagas flete, compras en bultos, al contado, y a veces "no había" (fill 85%).
2. **Planificado-pero-lento (La Principal):** pides HOY para la SIGUIENTE ronda → obliga a pronosticar con una semana de anticipación; con volumen ≥ Bs 1,500 su 10% de descuento iguala el precio de Don Beto **con 98% de confiabilidad y crédito**. Premio directo a quien planifica.
3. **El impuesto a la improvisación (Toñito):** te salva del quiebre a media ronda, pero cada unidad cuesta 15% más — la clase ve en vivo cuánto cuesta no planificar.

---

## 3. MODELO DE DEMANDA

### 3.1 Demanda base semanal y eventos por ronda

Demanda base (unidades/semana): la columna R1 de la tabla 3.2. **Eventos** (el facilitador los anuncia como *brief narrativo* ANTES de decidir — nunca da el multiplicador exacto; el equipo debe estimarlo con el histórico):

| Ronda | Evento narrado | Multiplicadores aplicados |
|---|---|---|
| R1 | "Semana normal — conoce tu tienda" | Todos ×1.0 |
| R2 | "Ola de calor: 38 °C en Santa Cruz" | Agua ×1.8, Gaseosa ×1.5, Yogurt ×1.2, Leche ×1.1 |
| R3 | "Clásico Blooming-Oriente + parrillada del barrio" | Salchicha ×1.8, Snack ×1.7, Gaseosa ×1.6, Galletas ×1.2, Agua ×1.2 |
| R4 | "Quincena + rumor de escasez de aceite" | Aceite ×2.2, Papel ×1.5, Detergente ×1.5, Arroz ×1.4 (y Don Beto solo entrega 50% del aceite pedido) |
| R5 | "Kermesse del colegio" | Pan ×1.4, Salchicha ×1.6, Snack ×1.4, Gaseosa ×1.3, Galletas ×1.3, Huevo ×1.2, Agua ×1.2 |

### 3.2 Demanda PLANIFICADA 5 rondas × 13 productos (editable por el facilitador)

| Producto | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| Pan | 400 | 400 | 400 | 400 | 560 |
| Huevo | 180 | 180 | 180 | 180 | 216 |
| Leche | 60 | 66 | 60 | 60 | 60 |
| Yogurt | 25 | 30 | 25 | 25 | 25 |
| Salchicha | 20 | 20 | 36 | 20 | 32 |
| Gaseosa 2L | 50 | 75 | 80 | 50 | 65 |
| Agua | 70 | 126 | 84 | 70 | 84 |
| Galletas | 90 | 90 | 108 | 90 | 117 |
| Snack | 110 | 110 | 187 | 110 | 154 |
| Arroz | 35 | 35 | 35 | 49 | 35 |
| Aceite | 20 | 20 | 20 | 44 | 20 |
| Papel hig. | 15 | 15 | 15 | 22 | 15 |
| Detergente | 12 | 12 | 12 | 18 | 12 |

**Ruido:** demanda real = planificada × (1 + ε), con ε ~ Uniforme(−10%, +10%) sorteado **una vez por producto-ronda, igual para los 20 equipos**, redondeado a entero. El servidor genera la realización con semilla fija al crear la sesión (reproducible; el facilitador puede re-sortear antes de abrir la ronda). Realización de ejemplo usada en la verificación de la sección 6: Pan 410/396/397/372/511; Agua 63/138/76/73/92; Aceite 19/18/19/47/21; etc. (tabla completa generada con semilla 7).

### 3.3 Dataset HISTÓRICO semilla — "las últimas 8 semanas de la tienda de tu tía"

Se carga en Supabase al crear la sesión; alimenta los gráficos desde la ronda 1. Coherente con la base (±8%) e incluye **dos patrones descubribles**: S3 fue semana de calor y S6 fue quincena — el equipo analista que grafica descubre cuánto saltó el agua con calor (~+60%) y el papel en quincena (~+45%), y usa eso para dimensionar los eventos anunciados.

| Producto | S1 | S2 | S3☀️ | S4 | S5 | S6💰 | S7 | S8 | Promedio |
|---|---|---|---|---|---|---|---|---|---|
| Pan | 376 | 386 | 383 | 382 | 371 | 381 | 382 | 422 | 385 |
| Huevo | 180 | 170 | 189 | 167 | 167 | 167 | 175 | 187 | 175 |
| Leche | 61 | 63 | 64 | 57 | 63 | 61 | 58 | 60 | 61 |
| Yogurt | 23 | 26 | 27 | 24 | 25 | 27 | 27 | 26 | 26 |
| Salchicha | 19 | 20 | 20 | 20 | 19 | 18 | 21 | 21 | 20 |
| Gaseosa 2L | 53 | 53 | **70** | 53 | 49 | 52 | 49 | 52 | 54 |
| Agua | 65 | 71 | **111** | 72 | 65 | 67 | 69 | 75 | 74 |
| Galletas | 85 | 97 | 96 | 88 | 85 | 84 | 87 | 85 | 88 |
| Snack | 118 | 105 | 109 | 101 | 102 | 102 | 114 | 112 | 108 |
| Arroz | 36 | 35 | 33 | 33 | 37 | **44** | 32 | 33 | 35 |
| Aceite | 20 | 20 | 21 | 22 | 20 | 21 | 19 | 20 | 20 |
| Papel hig. | 15 | 15 | 14 | 15 | 14 | **22** | 15 | 16 | 16 |
| Detergente | 12 | 12 | 13 | 12 | 12 | **19** | 12 | 13 | 13 |

---

## 4. ECONOMÍA DEL EQUIPO

| Parámetro | Valor | Racional |
|---|---|---|
| **Capital inicial (caja)** | **Bs 2,000** | Cubre ~64% de una semana al costo; con el crédito de La Principal (Bs 1,000) alcanza para stockearse bien en R1, pero obliga a priorizar |
| **Inventario heredado** ("la tienda que te deja tu tía") | Huevo 60u (vence fin R2), Leche 20 (vence fin R1), Yogurt 8 (fin R1), Salchicha 6 (fin R1), Gaseosa 24, Agua 30, Galletas 40, Snack 50, Arroz 15, Aceite 8, Papel 6, Detergente 5. **Valor al costo: Bs 1,168.50** | Hay perecederos "viejos" desde el minuto 1 → la primera lección de trazabilidad es gratis |
| **Activos iniciales totales** | **Bs 3,168.50** | Base común para medir utilidad |
| **Costos fijos por ronda** | **Bs 200** (alquiler, luz, bolsas) | No jugar cuesta Bs 1,000 en el taller — mata el exploit del "fantasma" |
| **Costo de almacenaje** | **5% del valor al costo del inventario al cierre de cada ronda** | Fácil de calcular a mano; castiga acaparar |
| **Merma por vencimiento** | 100% del costo pagado por la unidad (FIFO por fecha de vencimiento) | KPI visible "Bs perdidos en merma" |
| **Liquidación al final de R5** | No perecederos: 50% del costo; perecederos aún vigentes: 25%; vencidos: 0 | Evita tanto el "compro todo en R5" como ignorar el valor del stock final |
| **Crédito** | Solo La Principal, hasta Bs 1,000, se descuenta automáticamente de la caja al inicio de la ronda siguiente | Introduce capital de trabajo sin permitir caja negativa |
| **Regla de caja** | La caja nunca puede ser negativa: el pedido que excede caja + crédito disponible se recorta proporcionalmente (la UI avisa antes de enviar) | Anti-exploit (c) |

---

## 5. SISTEMA DE PUNTUACIÓN (0-100) para rankear 20 equipos

Puntaje = **G + S + H + A**, recalculado y publicado tras cada ronda (ranking en vivo).

| Comp. | Nombre | Peso | Fórmula | Qué enseña |
|---|---|---|---|---|
| **G** | Ganancia acumulada | **45** | `45 × (U_equipo − U_min) / (U_max − U_min)` — U = variación de activos totales (caja + valor a costo del inventario) vs. Bs 3,168.50 iniciales; incluye liquidación en R5 | La utilidad manda, pero no es lo único |
| **S** | Nivel de servicio | **25** | `25 × (ventas en Bs / demanda en Bs)` acumulado | Perder ventas = perder clientes |
| **H** | Salud de inventario | **20** | `20 × max(0, 1 − (merma Bs + almacenaje Bs) / compras Bs)` | Comprar de más se paga en merma y almacén |
| **A** | Ojo del Analista | **10** | `10 × max(0, 1 − MAPE)`, MAPE = promedio sobre producto-ronda de `min(1, |disponible − demanda| / demanda)` | Premia directamente pronosticar bien |

**Desempates (en orden):** 1) mayor S, 2) menor merma en Bs, 3) mayor caja final. **Premios secundarios** sugeridos para la premiación (sin afectar el ranking): "Cero merma", "Mejor pronóstico" (menor MAPE), "Remontada" (mayor ganancia R4-R5).

**Anti-exploits (verificados numéricamente en la sección 6):**

| Exploit | Mecánica que lo mata | Evidencia simulada |
|---|---|---|
| (a) No jugar / no comprar | Bs 200 fijos/ronda + S y A se desploman; quien no envía decisión compra 0 pero **sigue pagando fijos y perdiendo ventas** (nunca "ganancia 0" neutra) | Fantasma: utilidad **−580**, puntaje **2.3/100**, último |
| (b) Apostarlo todo sin análisis | Merma de perecederos + almacenaje 5% + liquidación al 50% + eventos que superan su colchón (aceite ×2.2 > 1.5) | Agresiva queda 8.1 puntos y Bs 848 debajo de la analítica |
| (c) Compras absurdas sin capital | Caja nunca negativa; pedido recortado a caja + crédito Bs 1,000 | En R1 la agresiva quiso comprar Bs ~3,700 y solo pudo Bs 1,970 |
| (d) Acumular caja sin vender | G pesa solo 45; S (25) y A (10) exigen vender y pronosticar | Conservadora: buena salud (100%) pero **59.9/100**, tercera |

---

## 6. VERIFICACIÓN NUMÉRICA — 3 estrategias + fantasma, 5 rondas

Simulación ejecutada con las reglas exactas de las secciones 1-5 (script reproducible en `C:\Users\Usuario\AppData\Local\Temp\claude\c--Users-Usuario-Documents-Stock-Perfecto---UPSA\00b35f34-08b1-4192-9265-e8585417d5ec\scratchpad\sim.py`, semilla 7). Simplificaciones del modelo a mano: todas compran en Don Beto (90% + Bs 30 flete, fill de R4 aplicado); sin redondeo a bultos; sin uso de crédito. Definiciones:

- **Conservadora:** cada ronda compra hasta 60% de la demanda base, ignora eventos e histórico.
- **Agresiva:** cada ronda repone hasta 150% de la base, sin mirar eventos.
- **Analítica:** pronóstico = promedio histórico × multiplicador estimado del brief (capta ~90% del efecto real del evento) + **10% de stock de seguridad**, neto del inventario disponible.

**Traza por ronda (compras pagadas / ventas / merma / caja al cierre, en Bs):**

| R | Conservadora | Agresiva | Analítica |
|---|---|---|---|
| 1 | 675 / 2,575 / 0 → caja 3,700 | 1,970 / 4,296 / 0 → 4,119 *(recortada por caja)* | 1,961 / 4,317 / 4 → 4,149 *(recortada por caja)* |
| 2 | 1,727 / 2,575 / 0 → 4,348 | 4,104 / 4,919 / 92 → 4,689 | 3,431 / 5,043 / 20 → 5,550 |
| 3 | 1,727 / 2,575 / 0 → 4,996 | 3,361 / 5,036 / 91 → 6,122 | 3,560 / 5,231 / 19 → 7,007 |
| 4 | 1,471 / 2,197 / 0 → 5,521 | 2,975 / 4,600 / 76 → 7,514 | 2,768 / 4,530 / 11 → 8,567 |
| 5 | 1,727 / 2,575 / 0 → 6,169 | 3,601 / 5,056 / 40 → 8,723 | 3,622 / 5,102 / 39 → 9,835 |
| Liquidación | +0 | +355 | +92 |

**Resultado final y puntaje:**

| Estrategia | Utilidad (Bs) | Servicio | Merma (Bs) | Almacenaje (Bs) | MAPE | G(45) | S(25) | H(20) | A(10) | **TOTAL** | Puesto |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Analítica** | **6,758** | 97.5% | 94 | 44 | 8.6% | 45.0 | 24.4 | 19.8 | 9.1 | **98.3** | **1º** |
| Agresiva | 5,910 | 96.2% | 299 | 172 | 30.5% | 39.8 | 24.1 | 19.4 | 7.0 | **90.2** | 2º |
| Conservadora | 3,001 | 50.3% | 0 | 0 | 46.5% | 22.0 | 12.6 | 20.0 | 5.3 | **59.9** | 3º |
| Fantasma (no juega) | **−580** | 6.4% | 0 | 0 | 92.7% | 0.0 | 1.6 | 0.0 | 0.7 | **2.3** | 4º |

**Veredicto:** la analítica gana con **+Bs 848 de utilidad (+14%) y +8.1 puntos** sobre la agresiva — margen claro (equivale a ~3-4 posiciones en un campo de 20 equipos) pero no absurdo: una agresiva disciplinada sigue siendo competitiva, que es exactamente la tensión deseada. La victoria analítica proviene de tres fuentes medibles: merma 3× menor (94 vs 299), almacenaje 4× menor, y captura de los picos que superan el colchón fijo de la agresiva (aceite ×2.2 en R4, pan ×1.4 en R5).

**Ajustes documentados durante la calibración:**
1. **Capital inicial Bs 1,500 → Bs 2,000.** Con 1,500 el tope de caja de R1 recortaba tanto a agresiva como a analítica hasta casi igualarlas en R1 y bajaba ~2 pts el servicio de todas (analítica 6,576 / agresiva 5,704; el orden final no cambiaba). Con 2,000 la restricción sigue mordiendo (ambas quisieron gastar más en R1 y no pudieron) pero sin aplanar las diferencias.
2. **Agresiva definida "con reposición"** (150% de base neto de inventario) en lugar de compra bruta fija: la versión bruta acumulaba inventario sin límite y perdía por goleada (resultado estrafalario, poco creíble como benchmark). La versión actual es el "apostador razonable" y aun así pierde.
3. **Fill rate de Don Beto concentrado en R4** (90% general, 50% en aceite) en vez de ruido de entrega en todas las rondas: mismo aprendizaje, mucho más fácil de narrar y auditar en vivo.

**Cifras de control para QA de la implementación:** semana base = Bs 3,146 al costo / Bs 4,296 a PV; inventario heredado = Bs 1,168.50; activos iniciales = Bs 3,168.50; con las reglas y semilla indicadas, los cuatro totales de la tabla final deben reproducirse exactamente (98.3 / 90.2 / 59.9 / 2.3).