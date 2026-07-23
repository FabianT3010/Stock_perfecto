# ENTREGABLE — LENTE: DISEÑO PEDAGÓGICO Y NARRATIVA
## "Stock Perfecto v2: La Tiendita de Doña Peta"

---

## 0. SUPUESTOS DECLARADOS (ajustables, coordinables con el lente de datos/mecánica)

- Taller presencial de 120 min, 20 equipos de 3-5 estudiantes, 1 celular por equipo, facilitador con proyector.
- 1 ronda = 1 semana de la tienda. 5 rondas = 5 semanas.
- La demanda de cada semana es **idéntica para todos los equipos** (misma "realidad", distinta gestión) → la competencia es justa y el debrief puede comparar decisiones.
- Catálogo de 6 productos y 3 proveedores (números abajo). Si el lente de datos propone otros valores, este diseño pedagógico funciona igual mientras se conserven los *arquetipos*: 1 producto estrella estable, 1 perecedero, 1 de margen alto e impulso, 1 básico lento, 1 variable, 1 con MOQ incómodo.
- Capital inicial: **Bs 1.500 en caja** + inventario inicial pequeño (heredado de Doña Peta).
- Puntaje visible desde la ronda 1: **PUNTAJE = CAJA FINAL + (INVENTARIO AL COSTO ÷ 2) + (5 × % DE SERVICIO PROMEDIO)**. Esto corrige el bug de diseño v1: no decidir ya no da 0 "neutro" — el inventario viaja, así que no comprar significa quedarse sin stock, perder clientes y hundir el % de servicio. El que no juega, pierde por diseño.

### Dataset mínimo de referencia (para que las hojas del analista tengan números reales)

**Catálogo** (Bs por unidad):

| Producto | Costo distribuidor | Costo mercado | Precio venta | Característica |
|---|---|---|---|---|
| Coca-Cola 2L (EMBOL) | 10,0 | 11,0 | 13,0 | Estrella, demanda estable-alta |
| Leche PIL 1L | 5,5 | 6,0 | 7,0 | **Perecedera**: lo que sobra al cierre de semana se bota |
| Yogurt PIL 1L | 8,0 | 8,5 | 11,0 | **Perecedero**, demanda variable |
| Arroz Grano de Oro 1kg | 5,5 | 5,0 | 7,0 | No perece, rotación lenta, MOQ arroba en mercado |
| Aceite Fino 900ml | 10,5 | 10,0 | 13,0 | No perece, demanda irregular |
| Snacks surtidos (galletas Mabel's, chizitos) | 2,5 | 2,8 | 4,0 | Margen % alto, impulso, volumen |

**Proveedores:**

| Proveedor | Entrega | Costo extra | MOQ | Rol pedagógico |
|---|---|---|---|---|
| Camión distribuidor (EMBOL/PIL/Fino) | **La próxima semana** (lead time 1 ronda) | 0 | Por caja: Coca ×6, Leche ×12, Yogurt ×6, Aceite ×12, Snacks ×24 | Lead time + MOQ |
| Mercado La Ramada (vas vos) | Inmediata (misma ronda) | Bs 20 de taxi por viaje | Bajo (×1 a ×6); arroz solo por arroba (×12) | Trade-off precio/rapidez |
| Almacén Don Lucho (el rival de enfrente) | Inmediata | Precio = tu costo +25%, sin MOQ | Ninguno | Costo de la desesperación |

**Histórico de demanda (8 semanas, visible desde el minuto 1):**

| Producto | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | Promedio | Mín–Máx |
|---|---|---|---|---|---|---|---|---|---|---|
| Coca 2L | 42 | 38 | 45 | 40 | 51 | 39 | 44 | 41 | **42,5** | 38–51 |
| Leche | 30 | 28 | 33 | 29 | 31 | 27 | 32 | 30 | **30,0** | 27–33 |
| Yogurt | 12 | 15 | 9 | 14 | 11 | 16 | 10 | 13 | **12,5** | 9–16 |
| Arroz | 18 | 20 | 17 | 19 | 21 | 18 | 20 | 19 | **19,0** | 17–21 |
| Aceite | 8 | 12 | 7 | 11 | 9 | 13 | 8 | 10 | **9,75** | 7–13 |
| Snacks | 60 | 55 | 70 | 58 | 65 | 52 | 68 | 61 | **61,1** | 52–70 |

---

## 1. BRIEF NARRATIVO (texto final, listo para proyectar y repartir — cabe en 1 página)

> ### LA TIENDITA DE DOÑA PETA
> **Barrio Pampa de la Isla, Santa Cruz de la Sierra.**
>
> Hace 24 años, Doña Petrona "Peta" Suárez abrió una tienda de barrio a dos cuadras del colegio. Ahí compran todos: la señora que necesita aceite a las siete de la mañana, los changos que salen del cole a comprar chizitos, el vecino que manda a su hijo "andá traé una Coca de dos litros". Doña Peta nunca estudió administración, pero tiene algo mejor: **un cuaderno**. Ahí anotó, semana a semana, todo lo que vendió durante los últimos dos meses.
>
> El problema: su hija va a dar a luz en Cochabamba y Doña Peta se va **cinco semanas**. Y justo ahora, cuando enfrente acaba de abrir el **Almacén Don Lucho**, más grande, con más plata… y con ganas de quedarse con sus caseros.
>
> Ustedes son sus sobrinos. Acaban de salir del colegio y ella les entrega tres cosas: **la llave de la tienda, Bs 1.500 en el cajón y su cuaderno de ventas.** Antes de subir a la flota, les dice:
>
> *"No me la dejen morir. Tres cosas les pido. Uno: que ningún casero se vaya con las manos vacías, porque el que cruza la calle donde Don Lucho una vez, no vuelve. Dos: no me boten plata a la basura, la leche que se vence no la paga nadie. Y tres: cuando vuelva, quiero encontrar MÁS plata de la que dejé. No adivinen. Lean el cuaderno. Los números no mienten."*
>
> Cada semana ustedes decidirán **qué comprar, cuánto y a quién**: el camión distribuidor es más barato pero recién llega la próxima semana; en La Ramada consiguen todo al toque pero pagan taxi; y si se quedan sin nada… tendrán que ir a comprarle a Don Lucho a precio de castigo, y tragarse el orgullo.
>
> Al final de las cinco semanas, Doña Peta vuelve y revisa tres números: **cuánta plata hay en caja, cuánta mercadería útil quedó y a qué porcentaje de caseros atendieron sin decirles "no hay".** La tienda que mejor combine las tres cosas se queda con el título de **Mejores Analistas del Barrio**.
>
> La tienda es de ustedes. El cuaderno también. **Piensen antes de comprar.**

*(Notas de tono: cercano, cruceño ligero — "changos", "al toque", "caseros", "flota" —, sin diminutivos infantiles, sin humor forzado. La frase "Lean el cuaderno. Los números no mienten" es el lema del taller: se repite en cada debrief.)*

---

## 2. OBJETIVOS DE APRENDIZAJE POR RONDA + TRADUCCIÓN DE CONCEPTOS

### Mapa ronda → concepto

| Ronda | Título narrativo | Concepto(s) nuevo(s) | Conceptos que se refuerzan | Objetivo observable ("al final de esta ronda el equipo puede…") |
|---|---|---|---|---|
| **R1 — "La primera semana"** | Semana normal. Solo mercado La Ramada disponible ("el camión pasa recién la próxima"). | **Forecast** (pronóstico con promedio y rango) | — | Calcular el promedio y el rango del histórico y pedir cantidades basadas en datos, no en corazonadas. |
| **R2 — "La semana traicionera"** | Se habilita el camión distribuidor (más barato, llega en 1 semana, MOQ por caja). La demanda sale arriba del promedio en 2 productos. Al cierre: **noticia de la kermesse del colegio para la semana 3**. | **Nivel de servicio**, **stock de seguridad**, **lead time**, **MOQ** | Forecast | Explicar por qué pedir "el promedio justo" falla la mitad de las veces, y decidir cuánto colchón agregar. Entender que lo pedido al camión HOY llega RECIÉN la próxima semana. |
| **R3 — "La kermesse"** | Demanda de Coca y snacks ~×2. Quien no pidió al camión en R2 debe correr a La Ramada o rogarle a Don Lucho. | **Anticipación / planificación con lead time** (aplicado bajo presión) | Nivel de servicio, MOQ | Conectar una señal del entorno (evento anunciado) con una compra anticipada. Cuantificar cuánto costó NO anticipar (margen perdido con Don Lucho + ventas perdidas). |
| **R4 — "La semana de la plata dormida"** | Semana floja post-kermesse (demanda -20% en varios productos). La leche/yogurt sobrante se botó. Equipos sobre-stockeados descubren que no tienen caja para reponer. | **Merma**, **rotación**, **flujo de caja** | Forecast (ajustar a la baja también es pronosticar) | Distinguir "tener mercadería" de "tener plata". Calcular cuántos Bs murieron en merma y cuántos están dormidos en el estante. |
| **R5 — "Vuelve Doña Peta"** | Semana final normal. Se recuerda la fórmula de puntaje: el inventario sobrante vale solo la mitad. | **Optimización integrada** (servicio vs. costo vs. caja: el equilibrio del analista) | Todos | Tomar una decisión final que balancea los tres KPIs a la vez y justificarla con un número. |

### Diccionario del analista (cada concepto en UNA frase para un chico de 17 — se proyecta y va impreso al dorso de la Hoja del Analista)

| Concepto real | Cómo se dice en el taller |
|---|---|
| **Forecast (pronóstico)** | "Adivinar con datos: mirar cuánto se vendió antes para estimar cuánto se venderá esta semana." |
| **Lead time** | "Lo que pedís hoy no llega hoy: es el tiempo entre hacer el pedido y tenerlo en el estante." |
| **MOQ (pedido mínimo)** | "El proveedor no te vende de a poquito: o llevás la caja entera, o no hay trato." |
| **Stock de seguridad** | "El colchón: unidades extra por si la demanda sale más alta que tu pronóstico." |
| **Nivel de servicio** | "De cada 100 caseros que entraron a comprar, ¿a cuántos les dijiste 'sí hay'?" |
| **Merma** | "Plata que se va a la basura: la leche vencida no la paga nadie." |
| **Rotación** | "Qué tan rápido tu plata entra y sale del estante: mercadería parada es plata dormida." |
| **Flujo de caja** | "La plata que tenés HOY en el cajón: podés ser rico en mercadería y no tener ni para el taxi a La Ramada." |
| **Quiebre de stock (stockout)** | "El momento en que decís 'no hay'… y tu casero cruza la calle donde Don Lucho." |

Regla pedagógica: el facilitador **siempre nombra el concepto con su nombre real en el debrief** ("eso que les pasó se llama quiebre de stock") — la jerga se gana viviendo la situación, nunca antes.

---

## 3. GUION DEL TALLER MINUTO A MINUTO (~120 min, 20 equipos)

| Reloj | Duración | Bloque | Qué pasa (y qué proyecta el facilitador) |
|---|---|---|---|
| 0:00–0:08 | 8' | **Bienvenida + gancho** | Pregunta al aire: "¿Alguien fue alguna vez a la tienda y no había lo que buscaba? ¿Volvió a esa tienda?" 2-3 respuestas. "Hoy van a estar del otro lado del mostrador. Y van a descubrir que detrás de cada estante lleno hay alguien que hizo matemática." Se presenta el premio. |
| 0:08–0:14 | 6' | **Formación de equipos + ingreso** | Equipos ya pre-armados por mesas (crítico: NO armar equipos en vivo con 100 personas). Cada mesa tiene: código de sala en un cartel, Hoja del Analista R1 impresa, tarjetas de rol (opcional, ver §7). Entran con el código, ponen nombre de equipo ("nombre de tienda": máx. 20 caracteres). |
| 0:14–0:21 | 7' | **Brief narrativo** | El facilitador LEE el brief en voz alta (proyectado, con la foto de la tienda). Cierra con el lema: "Lean el cuaderno. Los números no mienten." Muestra la fórmula de puntaje en pantalla y la deja fija en la app. |
| 0:21–0:29 | 8' | **Exploración guiada de datos ("Ronda 0")** | Tour de la app en el proyector: catálogo, histórico de 8 semanas, gráfico de demanda, la caja con Bs 1.500. Micro-reto sin puntaje: "En 3 minutos: ¿cuál es el promedio semanal de Coca 2L? ¿Qué producto deja más Bs de ganancia por unidad?" Primer equipo en responder gana un aplauso (calibra el ritmo y verifica que todos los celulares funcionan). |
| 0:29–0:40 | 11' | **RONDA 1** (7' decisión + 4' revelación/debrief) | Solo La Ramada disponible. Timer visible de 7 min en el proyector. Revelación: demanda real, ganancia, % servicio, ranking. Debrief R1 (§5). |
| 0:40–0:52 | 12' | **RONDA 2** (7' + 5') | Se habilita el camión (lead time + MOQ, explicado en 60 segundos con un diagrama: "pedís hoy → llega la próxima semana"). Revelación + debrief. **Último minuto: "Noticia del barrio": afiche de la KERMESSE del colegio para la semana que viene.** Silencio dramático. "Ustedes verán qué hacen con esta información." |
| 0:52–0:59 | 7' | **CORTE A MITAD** | Pausa corta (baño/agua). En pantalla queda fijo: ranking parcial + el afiche de la kermesse + el histórico de la semana 5 resaltado ("la última vez que hubo calor, la Coca saltó de 42 a 51… una kermesse es mucho más que calor"). La pausa ES parte del juego: los equipos vuelven conversando estrategia. |
| 0:59–1:12 | 13' | **RONDA 3 — KERMESSE** (8' + 5') | Demanda Coca ~×2, snacks ~×2. La revelación de esta ronda es el clímax emocional: ranking se sacude. Debrief R3 (§5): se comparan en proyector un equipo que anticipó vs. uno que compró a Don Lucho. |
| 1:12–1:25 | 13' | **RONDA 4 — RESACA** (8' + 5') | Demanda floja. Pantalla de merma: "esta semana el barrio botó X litros de leche = Bs Y a la basura" (suma de todos los equipos — el número agregado impacta). Debrief R4. |
| 1:25–1:37 | 12' | **RONDA 5 — VUELVE DOÑA PETA** (7' + 5') | Antes de decidir, recordatorio: "el inventario sobrante vale la mitad; la caja vale entera". Revelación final SIN ranking todavía (se guarda para la premiación). |
| 1:37–1:48 | 11' | **DEBRIEF FINAL** | Guion completo en §6. Incluye 2 gráficos comparativos entre equipos. |
| 1:48–2:00 | 12' | **Premiación + cierre** | Ranking final revelado en vivo (contando desde el 5.º puesto hacia el 1.º). Premios: 1.º "Mejores Analistas del Barrio", + premio "Mejor Analista" a la mejor Hoja del Analista (§7). Foto grupal, QR con certificado (opcional) y mensaje de carreras UPSA. |

**Colchones de tiempo:** el guion suma ~117'. Si el taller se atrasa >5', el recorte estándar es: debrief R4 de 5'→3' y exploración guiada de 8'→6'. **Nunca** recortar el debrief de R3 (es el momento pedagógico central) ni el debrief final.

**Reglas operativas para que 20 equipos no descarrilen:** timer duro con cierre automático de decisiones (la app cierra el formulario, sin excepciones desde R1 — se avisa); si un equipo no envía, su pedido es 0 y sufre las consecuencias naturales (inventario se agota → servicio cae); 1-2 asistentes circulando ("meseros de datos") con la única instrucción de responder preguntas de la app, **jamás** sugerir cantidades.

---

## 4. HOJA DEL ANALISTA (impresa, 1 por ronda por equipo; se llena ANTES de tocar el celular)

Regla de oro impresa arriba de cada hoja: **"Prohibido pedir sin responder. Los números no mienten."** El vocero del equipo debe poder mostrar la hoja llena si el facilitador pasa por la mesa.

### Hoja R1 — "Leer el cuaderno"
1. ¿Cuál fue la venta **promedio semanal** de Coca 2L y de leche en las 8 semanas del cuaderno? ¿Y la semana más alta y más baja de cada una?
2. ¿Qué producto deja **más ganancia por unidad** (precio − costo)? ¿Es el mismo que **más unidades** vende? *(Respuesta esperada: aceite/Coca ganan por unidad; snacks ganan por volumen — primera vez que separan margen de volumen.)*
3. Con Bs 1.500, ¿les alcanza para comprar el promedio de TODO? Calculen el costo total de pedir el promedio de cada producto. *(Sí alcanza, ~Bs 1.100 — pero obliga a costear ANTES de pedir.)*

### Hoja R2 — "El colchón y el camión"
1. La semana pasada: ¿en qué productos les **sobró** y en cuáles les **faltó**? ¿Cuántos clientes se fueron con las manos vacías (miren su % de servicio)?
2. Miren el rango del yogurt (9 a 16). Si piden el promedio (12), ¿aproximadamente cuántas semanas de cada 10 se van a quedar cortos? *(≈la mitad — el promedio se supera la mitad de las veces.)*
3. Lo que pidan HOY al camión llega **la próxima semana**. ¿Qué quieren tener en el estante la próxima semana… y qué necesitan YA de La Ramada para sobrevivir esta?
4. El camión vende Coca solo por caja de 6. Si necesitan 45, ¿piden 7 cajas (42) u 8 cajas (48)? ¿Qué cuesta cada error (venta perdida de Bs 3/u vs. Bs 10 parados por unidad)?

### Hoja R3 — "La kermesse" (se entrega junto con la noticia, al final de R2)
1. En la semana 5 del cuaderno (la de calor), la Coca subió de ~42 a 51 (+20%). Una kermesse trae al colegio entero: si estiman el **doble** de lo normal, ¿cuántas Cocas y snacks son?
2. ¿Cuánto de eso ya viene en camino en el camión que pidieron la semana pasada? ¿Cuánto les FALTA conseguir hoy y dónde?
3. Comprarle una Coca a Don Lucho cuesta Bs 12,50 y la venden a 13. ¿Vale la pena? ¿Cuándo SÍ vale la pena venderla casi sin ganar nada? *(Cuando protege al casero de cruzar la calle: el % de servicio también es plata en el puntaje final.)*

### Hoja R4 — "Plata dormida"
1. ¿Cuántos Bs botaron a la basura hasta hoy en leche y yogurt vencidos? (La app lo muestra: "Merma acumulada".) ¿Qué habrían comprado con esa plata?
2. Después de una fiesta, la gente compra menos. Si la demanda cae ~20%, ¿cuál es su nuevo pronóstico por producto? *(Pronosticar también es ajustar a la baja.)*
3. ¿Cuántos Bs tienen dormidos en el estante (inventario al costo) vs. despiertos en caja? ¿Con la caja actual, les alcanza para el pedido que quieren hacer? *(Los sobre-stockeados descubren aquí que no.)*

### Hoja R5 — "La rendición de cuentas"
1. Fórmula final: caja vale 100%, inventario sobrante vale 50%, cada punto de % servicio vale 5 Bs. ¿Dónde les conviene que esté su plata el domingo cuando llegue Doña Peta?
2. ¿Qué producto NO deberían casi ni tocar esta semana? *(Perecederos y lentos: todo lo que probablemente sobre.)*
3. Escriban en una frase su estrategia final ("apostamos a X porque Y"). — *Se usa en el debrief final: 3 equipos la leen en voz alta.*

---

## 5. MOMENTOS "AHA" DISEÑADOS (qué descubre el equipo, y cómo el debrief lo cristaliza)

| Ronda | El "aha" vivido | Guion de cristalización del facilitador (1-2 min, siempre con dato en pantalla) |
|---|---|---|
| **R1** | *"Adivinar y calcular no es lo mismo."* Los que pidieron "al ojo" quedan visiblemente peor que los que promediaron el cuaderno. | Proyectar 2 equipos anónimos: pedido vs. demanda real. "Este equipo pidió 70 Cocas 'por si acaso': tiene Bs 280 parados en el estante. Este pidió 43 mirando el cuaderno. Eso que hizo el segundo equipo tiene nombre: **pronóstico**. Es el primer trabajo de un analista de planificación." |
| **R2** | *"El promedio falla la mitad de las veces"* + *"quedarse sin stock también cuesta, aunque no se vea en la caja".* Aparece el % de servicio en rojo para varios. | Pantalla: histograma de yogurt. "El promedio es 12,5. ¿Cuántas semanas la demanda fue MAYOR? Cuatro de ocho. Pedir el promedio es lanzar una moneda. Las unidades extra que te protegen se llaman **stock de seguridad**, y decidir cuánto colchón poner es decidir tu **nivel de servicio**. Doña Peta se los dijo: el casero que se va donde Don Lucho, no vuelve." |
| **R3** | *"Planificar es anticipar: la información de hoy es el inventario de la próxima semana."* El clímax del taller: los que pidieron al camión en R2 arrasan; los que no, malvenden con Don Lucho o pierden clientes. | Comparar en proyector el mejor anticipador vs. el más golpeado (con permiso, con humor, sin humillar): "Los dos vieron el MISMO afiche el MISMO minuto. La diferencia no fue suerte ni plata: fue que uno convirtió una noticia en un pedido con una semana de anticipación. Eso es trabajar con **lead time**. En la vida real, las empresas piden la mercadería de Navidad en agosto." |
| **R4** | *"El inventario no es gratis: se vence, ocupa plata y te deja sin caja."* La doble bofetada: merma de lácteos + no poder financiar el pedido nuevo. | Pantalla del número agregado: "Entre las 20 tiendas botaron Bs X en leche vencida. Eso es **merma**. Y miren esta tienda: Bs 900 en el estante y Bs 60 en caja. Rica en mercadería, pobre en plata: eso es un problema de **flujo de caja** y de **rotación**. En el mundo real las empresas quiebran ASÍ, con los almacenes llenos." |
| **R5** | *"No existe la decisión perfecta: existe el equilibrio."* Nadie puede maximizar servicio, caja y estante lleno a la vez; hay que elegir conscientemente. | Se cristaliza en el debrief final (§6), no en un mini-debrief: "El puntaje final no premió al que más vendió, ni al que más ahorró, ni al que nunca dijo 'no hay'. Premió al que **equilibró** los tres. Ese equilibrio ES el trabajo del analista de planificación." |

Principio de diseño: **cada "aha" debe dolerle a por lo menos 5 equipos y salirle bien a por lo menos 5**, para que el debrief siempre tenga un héroe y una víctima anónimos que comparar. La calibración de demanda (lente de datos) debe garantizarlo: R2 con demanda sobre el promedio, R3 con pico ×2, R4 con caída del 20%.

---

## 6. DEBRIEF FINAL — GUION DE CIERRE (10-11 min, texto para el facilitador)

**(1) Reconectar con la historia — 1 min.**
"Doña Peta acaba de bajar de la flota. Entra a la tienda, abre el cajón, revisa el estante, y le pregunta a la vecina: '¿los changos atendieron bien?'. Esas tres miradas —la caja, el estante, los caseros— son exactamente los tres números de su puntaje. Y son exactamente los tres números que mira cualquier empresa del mundo."

**(2) Los tres gráficos de la verdad — 4 min.** *(en proyector, con datos reales de la sesión)*
- **Gráfico 1: caja por equipo, ronda a ronda (líneas).** "Miren cómo casi nadie que iba primero en la semana 2 terminó primero. Planificar no es un golpe de suerte, es una racha de buenas decisiones."
- **Gráfico 2: % de servicio vs. ganancia final (dispersión).** "¿Ven que los de arriba a la derecha no son los que MÁS compraron? Comprar demasiado te saca del gráfico por la caja; comprar muy poco, por el servicio."
- **Gráfico 3: la merma acumulada del salón.** "Entre todos botaron Bs X. En Bolivia, y en el mundo, cerca de un tercio de los alimentos se pierde antes de venderse. Los analistas de planificación pelean contra ese número todos los días."

**(3) Del cuaderno al Excel — 3 min.**
"Todo lo que hicieron hoy tiene nombre técnico y tiene sueldo. Sacar el promedio del cuaderno: *forecasting*. El colchón para el yogurt: *stock de seguridad*. Pedirle al camión una semana antes de la kermesse: *planificar con lead time*. Sufrir con la caja de 6 cuando necesitaban 45: *lote mínimo de compra*. La leche a la basura: *gestión de merma*. La plata dormida en arroz: *rotación de inventario*. Eso que hicieron con un celular y una hoja, lo hacen a diario los analistas de planificación de PIL, Sofía, EMBOL, la CBN, Farmacorp, Hipermaxi… con las mismas preguntas y hojas de cálculo más grandes. La tienda de Doña Peta y una multinacional se diferencian en los ceros, no en la lógica."

**(4) El mensaje de fondo — 2 min.**
"Fíjense en lo único que separó a los equipos de arriba de los de abajo: **antes de decidir, miraron los datos**. No fueron los más agrandados ni los que apostaron más fuerte. Fueron los que llenaron la hoja. Esa costumbre —preguntarle a los números antes que a las corazonadas— sirve para una tienda, para una empresa, y para decidir qué estudiar, en qué gastar, dónde trabajar. Si hoy descubrieron que les gustó ese momento en que el número les dijo qué hacer… esa sensación tiene carreras enteras dedicadas a ella, y varias se estudian aquí."

**(5) Última línea antes de la premiación.**
"Doña Peta les dejó una frase al irse. Díganla conmigo: **'Los números no mienten.'** Veamos qué dicen los números… vamos con el ranking."

---

## 7. IDEAS NUEVAS NO PEDIDAS (opcionales, con costo/beneficio)

| # | Idea | Descripción | Costo | Beneficio pedagógico | Veredicto |
|---|---|---|---|---|---|
| 1 | **Tarjetas de rol por equipo** (impresas, sin software) | 4 tarjetas por mesa: *Analista de datos* (llena la hoja), *Comprador* (opera el celular), *Contador* (vigila la caja), *Vocero* (habla en debriefs). Rotan cada ronda si quieren. | Casi cero (imprimir 80 tarjetas). | Evita que 1 chico juegue y 4 miren — el riesgo #1 con equipos de 5 y un solo celular. Da identidad profesional a cada uno. | **Hacerlo sí o sí.** |
| 2 | **"Noticias del barrio"** como tarjetas estilo WhatsApp en la app | Cada ronda abre con un mensaje de un vecino/de Doña Peta (audio o tarjeta): flavor + la señal de demanda de la ronda. | Bajo (contenido estático por ronda, ya existe Realtime). | Convierte los eventos de demanda en narrativa en vez de "el facilitador anuncia un modificador". Enseña a leer señales del entorno. | **Hacerlo.** |
| 3 | **Premio "Mejor Analista"** (segundo premio, por proceso) | Al final, el facilitador recoge las Hojas del Analista; la mejor documentada gana aparte del ranking. | Cero dev; 3 min de revisión durante la R5. | Premia el proceso y no solo el resultado: un equipo puede perder el ranking por una mala racha y aun así ser reconocido por pensar bien. Refuerza el mensaje central. | **Hacerlo.** |
| 4 | **Mini-graficador en la app** ("Mi tablero") | El equipo elige producto + métrica (demanda, stock, ventas perdidas) y la app arma el gráfico de líneas/barras. Cumple el requisito 10 del cliente de forma activa: ellos construyen el gráfico, no solo lo miran. | Medio (un componente de charts con los datos que ya viajan por Realtime). | "Graficar para entender" pasa de consigna a mecánica. La Hoja R4 puede exigir: "peguen aquí un pantallazo de su gráfico de leche". | **Hacerlo si hay tiempo de dev.** |
| 5 | **Certificado digital "Analista Junior de Planificación — UPSA"** | QR al final; PDF con nombre del equipo y su curva de caja. | Bajo (plantilla + datos de la sesión). | Recuerdo tangible + marketing orgánico de UPSA (los chicos lo comparten). | **Hacerlo.** |
| 6 | **"La llamada de Doña Peta"** (pista pagada) | Una vez por juego, el equipo puede "llamar a Doña Peta" (botón): recibe un consejo concreto para la ronda, pero cuesta Bs 30 de crédito telefónico. | Bajo-medio (5 textos de consejo pre-escritos). | Enseña que la información tiene valor y precio (concepto real: costo de la información). Mecánica de ayuda para equipos perdidos sin regalar nada. | Opcional, lindo si sobra tiempo de dev. |
| 7 | **Cuaderno de fiado** (crédito a vecinos) | Vender fiado sube demanda pero la plata llega 2 rondas después. | Alto (nueva contabilidad, más decisiones por ronda). | Profundiza flujo de caja… pero rompe el presupuesto de complejidad para 17 años y 8 min por ronda. | **No hacerlo en v2.** Guardar para versión universitaria. |
| 8 | **Demanda distinta por equipo** | Cada tienda con su propia realidad aleatoria. | Medio. | Negativo neto: rompe la comparabilidad del debrief ("mismo afiche, distinta decisión") y la percepción de justicia en la competencia. | **No hacerlo.** La demanda idéntica para todos es una decisión pedagógica, no una limitación. |

---

### Nota de coherencia para el sintetizador
Los tres pilares no negociables de este diseño pedagógico son: (a) **la Hoja del Analista se llena antes de cada decisión** — es lo que convierte el juego en formación de analistas y no en apuesta; (b) **el debrief de R3 (kermesse/lead time) es intocable en tiempo** — es el aha central; (c) **la fórmula de puntaje de tres componentes visible desde la ronda 1** — resuelve el bug de la v1, hace que el inventario que viaja importe y encarna el mensaje final del equilibrio. Todo lo demás (productos exactos, precios, magnitud de los eventos) es negociable con los otros lentes mientras se preserven los arquetipos de producto y la garantía de que cada "aha" tenga ganadores y perdedores visibles en sala.