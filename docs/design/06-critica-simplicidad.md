# Crítica: simplicidad pedagógica (¿lo entiende un chico de 17? ¿cabe en 2 h?)

> Crítica adversarial generada sobre los 5 diseños fuente (anexos 01-05), ANTES de la síntesis.
> Sus decisiones aceptadas están consolidadas en
> [`PLAN-V2.md`](../../PLAN-V2.md); no funciona como manual operativo.
> Las decisiones finales que absorben o descartan cada hallazgo están en PLAN-V2.md.

## Resumen

El material es de calidad alta pero describe CUATRO JUEGOS DISTINTOS que nadie reconcilió: 4, 5, 6 y 13 productos; capital inicial de 800, 1.000, 1.500 y 2.000 Bs; CINCO fórmulas de puntaje diferentes; la kermesse cae en R3 en una propuesta y en R5 en otra. Si se implementa "un poco de cada una", el taller fracasa antes de empezar. La única propuesta con presupuesto de tiempo realista es la de MECÁNICAS (98 min + 22 de buffer, 4 productos, una mecánica nueva por ronda): debe ser la columna vertebral. La narrativa de Doña Peta es excelente en tono pero está sobrecargada (10 conceptos en 5 rondas, hojas con cálculos imposibles de llenar en 7 minutos, y su guion suma 120/120 minutos con colchón CERO, no ~117 como afirma). La propuesta de economía diseñó un simulador universitario (13 productos, 4 proveedores, MAPE, normalización por cohorte) que un chico de 17 no puede ni operar ni entender por qué ganó. Veredicto: viable en 2 horas SOLO con recorte agresivo a 4-5 productos, 2 proveedores, 1 fórmula de puntaje de una línea, 4 KPIs y máximo 1-2 conceptos nuevos por ronda.

## Problemas

### 🔴 ALTA — Incoherencia total entre las cuatro propuestas

Cada lente definió su propio juego: catálogo de 6 (narrativa), 13 (economía), 4 (mecánicas), 5 (UX), 6 (técnica); capital 1.500 / 2.000 / 1.000 / 1.000 / 800 Bs; cinco fórmulas de puntaje incompatibles (caja+inv/2+5×servicio; G45+S25+H20+A10 con MAPE; caja+liquidación; ganancia+3×servicio−merma; 0.5/0.3/0.2 normalizado por cohorte); eventos distintos (kermesse en R3 vs R5; ola de calor y quincena solo en una); tiempos de decisión de 5, 7 y 8 min. Todo lo calibrado (umbrales de semáforo, simulaciones, seeds SQL) queda invalidado al elegir.

**Solución propuesta:** Congelar UN documento maestro antes de escribir una línea de código: estructura y ritmo de MECÁNICAS (4 productos, 2 proveedores, buffer 22 min, piloto automático), envoltura narrativa de Doña Peta (solo brief, nombres y lema), números recalibrados por el lente de economía SOBRE ese catálogo reducido, y UX/técnica implementan exactamente eso. Tabla única de parámetros (capital, tiempos, fórmula) al inicio del documento.

### 🔴 ALTA — Catálogo de 13 productos y 4 proveedores (economía) es inoperable a los 17 años

13 cantidades × elección entre hasta 4 proveedores, con 12 tamaños de bulto distintos, MOQ en Bs por pedido, descuentos escalonados (5%≥800, 10%≥1.500, 3%≥1.200), flete fijo, crédito que se descuenta solo, fill rate 85% y almacenaje del 5%: son 30-40 microdecisiones en 5-8 minutos (≈12 s cada una) para chicos que ven el concepto de inventario por primera vez. La propia propuesta admite el riesgo ('es manejable si la UI precarga 0'). Además la semana base cuesta Bs 3.146 con caja de 2.000: obliga a usar crédito en la RONDA 1, un concepto financiero extra el primer día.

**Solución propuesta:** Recortar a 4-5 productos que cubran los arquetipos (1 estrella estable, 1 perecedero corto, 1 margen alto/impulso, 1 lento trampa, opcional 1 de evento) y 2 proveedores (barato-lento con MOQ vs caro-inmediato con tope). Eliminar en v1: crédito, descuentos por volumen (salvo la promo puntual de R2 de mecánicas), fill rate como parámetro continuo (dejarlo solo como evento de R4), flete y bultos heterogéneos. Los 8 productos restantes van a la carpeta '2ª edición'.

### 🔴 ALTA — R2 de la narrativa mete 4 conceptos nuevos de golpe (viola la regla de 1-2 por ronda)

En 12 minutos totales el equipo debe absorber: nivel de servicio, stock de seguridad, lead time y MOQ, explicados 'en 60 segundos', mientras maneja por primera vez DOS horizontes de compra simultáneos (qué necesito YA de La Ramada + qué pido HOY al camión para la semana próxima = hasta 12 casillas), llena una hoja de 4 preguntas con cálculos y encima recibe la noticia de la kermesse. Es la ronda donde el 60% del salón se va a perder, y es justo la que alimenta el clímax de R3.

**Solución propuesta:** R2 enseña UNA cosa: lead time ('lo que pedís hoy llega la próxima semana'), con MOQ reducido a 'se compra por cajas' sin nombrarlo como concepto. Stock de seguridad y nivel de servicio no se explican en R2: el % de servicio aparece como KPI desde R1 sin teoría, y se les pone nombre en los debriefs de R3 y R4 cuando ya los vivieron ('eso que les pasó se llama...') — coherente con la propia regla pedagógica que la narrativa declara y luego incumple.

### 🔴 ALTA — El timing de la narrativa no cierra: 120/120 minutos, colchón cero y hojas imposibles

El guion suma exactamente 120 min (la propuesta afirma ~117: error aritmético); el 'colchón' ofrecido son recortes de 4 min sobre un plan que ya está lleno. Se llega a la primera decisión recién en el minuto 29 (24% del taller sin jugar). La Hoja R1 pide promedios de 8 semanas, comparar margen unitario de 6 productos Y costear el pedido promedio completo (6 multiplicaciones + suma) ANTES de tocar el celular, dentro de los mismos 7 min de decisión: con debate de equipo, eso son 10-12 min reales. Con 20 equipos, cualquier fricción (wifi, un reveal lento, 3 preguntas) descarrila todo, y la experiencia dice que SIEMPRE la hay.

**Solución propuesta:** Adoptar el presupuesto de mecánicas (98 + 22 de buffer). Comprimir la apertura de 29 a ~19 min: bienvenida 5, brief leído 4 (7 min de lectura en voz alta duermen a la sala), exploración guiada 6, equipos pre-registrados antes del taller. Decisión fija de 6 min con autocierre. Hoja del Analista: máximo 2 preguntas por ronda, cada una respondible en menos de 2 min; eliminar el costeo total de R1.

### 🔴 ALTA — Puntajes inexplicables: MAPE, normalización por cohorte y 4-5 fórmulas rivales

El score de economía (G+S+H+A) exige explicar MAPE a chicos de 17 y normaliza la ganancia contra el mín/máx de la cohorte: tu puntaje depende de lo que hicieron otros 19 equipos y cambia cada ronda, imposible de razonar en vivo ('¿por qué bajamos si ganamos plata?'). La técnica agrega una quinta fórmula (0.5/0.3/0.2 también relativa). Si el equipo no puede predecir cómo su decisión mueve su puntaje, el juego no enseña: genera superstición.

**Solución propuesta:** Una fórmula de UNA línea, absoluta y visible desde R1: Valor Total = caja + liquidación del inventario (mecánicas), con desempates por % de servicio y menor merma; o la de narrativa (caja + inventario/2 + bono por servicio) si se quiere el servicio dentro del número. MAPE, componente H y normalización por cohorte: fuera. El 'Mejor pronóstico' puede sobrevivir como premio secundario calculado por la app, sin explicar la sigla.

### 🟠 MEDIA — El canal exprés sin tope de cantidad desactiva la lección central del lead time

En la narrativa, La Ramada entrega ilimitado el mismo día pagando Bs 20 de taxi y ~1 Bs más por unidad. No anticipar la kermesse cuesta ≈ Bs 100 extra contra Bs 240 de margen en Coca: el que ignoró el afiche se salva casi gratis y el 'clímax pedagógico' de R3 (anticipar vs improvisar) no produce diferencias visibles en el ranking. El debrief se queda sin víctima que mostrar.

**Solución propuesta:** Copiar el tope de mecánicas: el canal exprés entrega máximo ~40 unidades por producto por semana ('lo que entra en la moto'). Así el que no pidió al camión en R2 físicamente NO PUEDE cubrir el pico de la kermesse y la diferencia se ve en el proyector. Es un parámetro, cuesta cero desarrollo extra.

### 🟠 MEDIA — Sobrecarga conceptual total: 10 conceptos + diccionario de 9 términos en 2 horas

Forecast, lead time, MOQ, stock de seguridad, nivel de servicio, merma, rotación, flujo de caja, quiebre de stock, optimización integrada... más préstamo/interés (mecánicas) y crédito de proveedor (economía). Un taller de 2 h con debriefs de 4 min fija 4-5 conceptos como máximo; el resto es ruido que diluye lo importante.

**Solución propuesta:** Núcleo intocable de 5: pronóstico, lead time, stock de seguridad/colchón, quiebre-nivel de servicio, merma. 'Rotación' y 'flujo de caja' se mencionan solo como frase en el debrief final ('plata dormida'), sin ficha ni KPI propio. Préstamo de cooperativa: a 2ª edición (el piloto automático + el inventario heredado ya evitan equipos-zombi); si un equipo queda en caja 0, el facilitador improvisa un 'Doña Peta te fía' manual.

### 🟠 MEDIA — 6 KPIs con semáforo contradicen el propio principio de UX ('un número grande por pantalla')

Cinco chicos alrededor de un celular de 360 px no procesan 6 tiles con semáforos de 3 estados, uno de ellos de RANGO (estante sano entre 15-45%, malo en ambos extremos: sutileza que ni adultos leen rápido). Sumados a 7 métricas graficables, ranking, badges y trazabilidad, el dashboard compite contra la decisión en vez de servirla.

**Solución propuesta:** 4 KPIs: Caja, Ganancia, Servicio, Merma. 'Valor del estante' baja a línea informativa dentro de la pestaña Tienda; 'Puntaje' vive solo en Podio. De las 7 métricas del constructor, dejar las 4 de los presets (demanda, pediste-vs-vendiste, plata caja+estante, ventas perdidas); las otras a 2ª edición.

### 🟠 MEDIA — Eventos apilados: economía mete 2-3 mecánicas por ronda y multiplicadores en hasta 8 productos

R4 de economía combina quincena + rumor de escasez + fill rate 50% del aceite (tres cosas que explicar a la vez); R5 aplica multiplicadores a 7 productos. Cada evento múltiple obliga al equipo a recalcular todo el catálogo en los mismos 5-8 min. Compárese con mecánicas: un evento por ronda, 2-4 productos afectados, y funciona.

**Solución propuesta:** Máximo 1 evento por ronda tocando 2-3 productos. Solo dos eventos con peso mecánico en todo el taller: el anunciado (feria/kermesse, R3) y el sorpresivo (falla del camión, R4). Calor, surazo y quincena quedan como color narrativo o se eliminan.

### 🟠 MEDIA — Premio 'Mejor Analista' y debrief final no caben en el tiempo asignado

Revisar 100 hojas (20 equipos × 5 rondas) 'en 3 min durante la R5' es materialmente imposible. El debrief final de 11 min incluye 3 gráficos comentados + discurso en 4 actos + lectura de estrategias de 3 equipos + transición a premiación de 12 min con revelación puesto por puesto, foto y QR: en sala real son 30 min, no 23.

**Solución propuesta:** Premio de proceso automático ('Mejor pronóstico', lo calcula la app) o que los asistentes preseleccionen 3 hojas durante R4. Debrief final: 2 gráficos (caja por ronda + servicio vs ganancia), sin lectura de estrategias. Premiación: revelar solo top 5, un premio principal + uno secundario, certificado por QR sin ceremonia.

### 🟠 MEDIA — Arranque y onboarding optimistas para 20 equipos con wifi de aula

UX promete onboarding en menos de 5 min (QR + código + nombre + logo + 3 tarjetas + tour) y la narrativa resuelve ingreso + micro-reto en 14 min. Con 20 celulares de gama media conectándose a la vez a wifi institucional, la experiencia real es 10-15 min, y un solo equipo trabado paraliza al facilitador.

**Solución propuesta:** Pre-crear la sesión y los 20 equipos ANTES del taller (cartel por mesa con código de equipo ya asignado y nombre pre-generado); el onboarding queda en entrar + swipe de 3 tarjetas. Ensayo técnico completo el día anterior (además despierta el proyecto Supabase free tier, riesgo ya identificado por el lente técnico). R1 tolerante: el default conservador de mecánicas ante fallo técnico es correcto, mantenerlo.

### 🟡 BAJA — Duplicaciones y sobras entre propuestas

El mini-graficador de narrativa (idea #4) duplica el constructor de gráficos de UX; el 'pedido exprés con recargo' ya existe como proveedor rápido; la liquidación de economía usa 3 tasas (50/25/0) donde bastan 2; conviven badges por ronda + 2 premios + premio de proceso + certificado; bottom sheet arrastrable de 3 posiciones (UX) es caro y frágil en gama media cuando un botón 'Ver datos' que abre el gráfico a media pantalla logra lo mismo.

**Solución propuesta:** Un solo constructor de gráficos (el de UX, reducido a 4 presets); liquidación 50% vigente / 0 vencido; badges limitados a 2 (feria y final); bottom sheet reemplazado por panel fijo desplegable sin drag. La 'llamada de Doña Peta' (idea #6) y el cuaderno de fiado: 2ª edición, como bien dice la propia propuesta.

### 🟡 BAJA — Parámetros ambiguos o sin dueño que estallarán en vivo

El taxi de Bs 20 ¿es por viaje, por producto o por ronda?; arroz solo por arroba (12 u) con demanda de 19; nombres de equipo libres (narrativa/mecánicas, riesgo de nombres impresentables en proyector) vs pre-generados (UX); duración de decisión 5 vs 7 vs 8 min; helado 'sin histórico' que exige apostar a ciegas en R2 (¿es pedagógico o lotería?). Cada ambigüedad es una discusión de 2 min con un equipo en medio del taller.

**Solución propuesta:** Resolver todo en la tabla única de parámetros del documento maestro: taxi por pedido-ronda; eliminar la arroba o subir demanda de arroz; nombres pre-generados obligatorios (la solución de UX es la correcta); decisión 6 min fijos; al helado darle una pista cuantitativa ('otras tiendas venden 40-70') visible en la app, no solo dicha al aire.

## Recomendaciones

- 1. Congelar UNA especificación maestra YA: esqueleto y presupuesto de tiempo de MECÁNICAS (98 min + 22 de buffer, piloto automático, autocierre), narrativa de Doña Peta solo como envoltura (brief, lema, nombres), economía recalibra sobre el catálogo reducido, UX y técnica implementan eso. Prohibido que cada lente conserve sus propios números.
- 2. Catálogo final: 4-5 productos (estrella estable, perecedero de 1-2 semanas, impulso de margen alto, lento-trampa) y 2 proveedores (camión barato con lead time 1 y MOQ por caja vs exprés caro e inmediato CON TOPE de ~40 u/producto). Los 13 productos, el 4º proveedor, crédito, descuentos escalonados y fill rate continuo: carpeta '2ª edición / versión universitaria'.
- 3. Puntaje de una línea visible desde R1: Valor Total = caja + liquidación del inventario (+ desempate por servicio y merma). Eliminar MAPE, componente 'Ojo del Analista', normalización por cohorte y las otras 4 fórmulas.
- 4. Mapa de conceptos estricto: R1 pronóstico, R2 lead time (MOQ sin nombre, 'se compra por cajas'), R3 anticipación + quiebre/servicio (nombrados en el debrief tras vivirlos), R4 merma + colchón, R5 cierre de horizonte. Total 5 conceptos con nombre; rotación y flujo de caja solo como frase del debrief final. Diccionario de 9 términos → 5.
- 5. Hoja del Analista: 2 preguntas por ronda, respondibles en <2 min, sin costeos de catálogo completo; quitar la regla infiscalizable 'prohibido pedir sin responder' y sustituirla por 'la app muestra la pregunta guía antes del formulario'. Mantener las tarjetas de rol (barato y resuelve el problema real de 1 chico jugando y 4 mirando).
- 6. Comprimir la apertura de 29 a ~19 min (bienvenida 5, brief 4, exploración 6, ingreso 4 con equipos pre-registrados) y fijar decisión en 6 min: la primera compra debe ocurrir antes del minuto 20.
- 7. Eventos: solo 2 con peso mecánico (kermesse/feria ANUNCIADA una ronda antes en R3; falla del camión SORPRESA en R4), máximo 2-3 productos afectados cada uno. Quincena, rumor de escasez, surazo: color narrativo o fuera.
- 8. Dashboard: 4 KPIs (caja, ganancia, servicio, merma) con semáforo ícono+palabra; gráficos = los 4 presets de un clic; constructor libre, 7ª métrica, bottom sheet arrastrable y mini-graficador duplicado: 2ª edición.
- 9. Premiación y cierre realistas: debrief final con 2 gráficos, top 5 revelado, 1 premio principal + 1 secundario automático ('Mejor pronóstico' calculado por la app en vez del concurso de hojas), certificado por QR sin ceremonia. Presupuestar 15 min reales y protegerlos con el buffer.
- 10. Ensayo general obligatorio el día anterior con 20 pestañas simuladas y los datos definitivos (además despierta el proyecto Supabase); pre-crear sesión y equipos; imprimir el brief y las hojas como respaldo si el wifi muere. El plan técnico debe construir contra la spec RECORTADA (4-5 productos, merma simple), lo que acorta F0-F2 del roadmap.
