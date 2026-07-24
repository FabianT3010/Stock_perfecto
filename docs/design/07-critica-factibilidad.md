# Crítica: factibilidad técnica (¿construible por 1 dev antes del evento?)

> Crítica adversarial generada sobre los 5 diseños fuente (anexos 01-05), ANTES de la síntesis.
> Sus decisiones aceptadas están consolidadas en
> [`PLAN-V2.md`](../../PLAN-V2.md); no funciona como manual operativo.
> Las decisiones finales que absorben o descartan cada hallazgo están en PLAN-V2.md.

## Resumen

Las cuatro propuestas son individualmente sólidas pero NO describen el mismo juego: difieren en catálogo (4 vs 5 vs 6 vs 13 productos), proveedores (2/3/4, con los nombres "Don Lucho" y "La Ramada" significando cosas opuestas según el documento), capital inicial (Bs 800/1.000/1.500/2.000) y, lo más grave, en CINCO fórmulas de puntaje incompatibles — y el puntaje ES el juego. El paquete completo suma 28–35 días-persona; el propio plan técnico admite 15 d-p para su MVP y aun así subestima la spec UX (bottom sheet arrastrable, tómbola, generador de nombres, revelación dramática no caben en los 3 d-p de "UI equipo"). Para 1 dev con evento cercano, el MVP honesto es 9–12 d-p: 6 productos, 2 proveedores, puntaje absoluto calculable a mano, motor FEFO con tests, robustez de red PRIMERO, y todo lo teatral (eventos, brief, hojas, premiación) en papel y voz del facilitador. Del repo actual se reutiliza de verdad ~30% (cañería: clientes Supabase, http, ids, tokens, primitivas UI, y los patrones RLS/handler/hook), pero el 100% del dominio se reescribe. El riesgo #1 del día del evento no es Supabase (25 clientes vs 200 conexiones: holgado) sino los websockets que mueren al bloquear pantalla — el hook actual no reconecta — más la pausa por inactividad del free tier; el ensayo general en el aula real 48h antes es innegociable.

## Problemas

### 🔴 ALTA — Cinco fórmulas de puntaje incompatibles

Pedagogía: CAJA + inventario/2 + 5×%servicio, visible y calculable a mano desde R1 (lo declara pilar innegociable). Economía: score 0–100 con 4 componentes (G45/S25/H20/A10), G normalizado contra el min/max de la cohorte y recalculado cada ronda. Mecánicas: Valor Total = caja + liquidación, servicio solo como desempate/2º premio. Arquitectura (engine.ts): 100×(0.5·profitNorm + 0.3·servicio + 0.2·(1−merma)) por ronda, también normalizado por cohorte. UX: ganancia + 3×servicio − merma. La normalización por cohorte además contradice el pilar pedagógico: tu puntaje cambia por lo que hacen otros equipos y un chico de 17 no puede auditarlo con su Hoja del Analista.

**Solución propuesta:** Congelar UNA fórmula absoluta y auditable antes de escribir código. Recomiendo la fusión pedagogía+mecánicas: Valor Total = caja + 50% del inventario vigente al costo + 5 Bs × punto de % servicio promedio (vencido = 0). Se calcula a mano, no depende de la cohorte, castiga al fantasma (el costo fijo hace el resto) y el ranking es la simple ordenación del Valor Total.

### 🔴 ALTA — Catálogo: 13 vs 6 vs 5 vs 4 productos

Economía diseña y simula 13 productos; arquitectura seedea 6; pedagogía diseña hojas y debriefs para 6; UX diseña chips, colores CVD y pantallas para 5 (su paleta validada soporta 6 series máx). En un Android de 360px con 7–8 min de decisión, 13 productos × 2–4 proveedores son 26–52 casillas por ronda: los equipos no terminan de pedir y el taller se arrastra. La propia economía admite el problema ('activar solo 1-8 en R1').

**Solución propuesta:** 6 productos máximo, conservando los arquetipos de pedagogía (estrella estable, perecedero corto, perecedero variable, básico lento, irregular, MOQ incómodo). Economía debe recalibrar su simulación (sim.py) contra el catálogo final de 6, no al revés.

### 🔴 ALTA — Proveedores: 2/3/4 con nombres cruzados entre propuestas

'Don Lucho' es el rival-castigo (+25%) en pedagogía, el mayorista barato con lead time en mecánicas y una distribuidora media en UX. 'La Ramada' es el mercado rápido-y-caro en pedagogía pero el mayorista barato-y-lento en arquitectura y UX. Economía agrega un 4º proveedor con crédito, flete, bultos y fill-rate 85%. Si el dev implementa leyendo documentos mezclados, el resultado es incoherente; y 4 proveedores × 6 productos duplica la superficie de UI y de motor.

**Solución propuesta:** 2 proveedores en la app (mecánicas tiene razón): uno barato con lead time 1 y MOQ/pack, uno caro de entrega inmediata sin mínimo (que además funge de 'rescate' y hace innecesario el préstamo). El 'rival de enfrente' vive solo en la narrativa del brief. Tabla única de nombres y condiciones firmada antes de codear.

### 🔴 ALTA — Alcance total infactible: 28–35 días-persona vs calendario real

Sumando lo que las 4 propuestas piden construir: MVP técnico F0–F6 = 15 d-p (estimación del autor); extras UX no cubiertos por F2/F3 (bottom sheet con drag, takeover de resultados, onboarding con generador de ~600 nombres curados + 12 logos propios, tómbola animada, leaderboard por barra espaciadora, 6 microcopys de estados feos) = +5–7 d-p; extras mecánicas (piloto automático, préstamo, badges, promo volumen, evento fill-rate) = +2–3 d-p; extras economía (13 productos, ruido con semilla, crédito, descuentos por volumen, bultos, liquidación en 3 niveles, MAPE) = +3–4 d-p; extras pedagogía software (noticias WhatsApp, certificado QR, llamada a Doña Peta) = +2–3 d-p; ensayo e imprevistos = +2. Total 28–35 d-p. Un dev con evento a 2–3 semanas tiene 10–15 días hábiles.

**Solución propuesta:** MVP honesto de 9–12 d-p (ver recomendaciones 1–4): la app solo hace lo que el papel y la voz no pueden — inventario que viaja, caja, cierre simultáneo de 20 equipos, ranking y 2 gráficos. Todo lo demás es low-tech o se pospone.

### 🔴 ALTA — Robustez de red planificada al final (F4) siendo el riesgo #1

Verificado en el repo: useSessionData.ts (133 líneas) hace .subscribe() sin callback de estado, sin polling de respaldo, sin refetch en visibilitychange/online. En aula real los chicos bloquean el celular entre rondas → el websocket muere → el equipo queda congelado mirando datos viejos. El roadmap lo pone en F4, después de 8.5 d-p de trabajo: si el tiempo se acaba, se recorta justo lo innegociable.

**Solución propuesta:** Mover F4 al día 1–2: el hook v2 (resuscripción con backoff, polling 12s de sessions/rounds, refetch total al desbloquear pantalla, indicador 'reconectando') se escribe antes que la UI del juego y se prueba con 3 celulares reales con pantalla bloqueada. 1.5 d-p bien gastados al inicio, no al final.

### 🟠 MEDIA — Capital inicial y costos fijos: 4–5 valores distintos

Capital: pedagogía Bs 1.500, economía Bs 2.000 (ajuste documentado con simulación), mecánicas Bs 1.000, arquitectura Bs 800, UX calibra todos sus semáforos a Bs 1.000. Costo fijo/ronda: 200 (economía) vs 150 (mecánicas) vs 60 (arquitectura) vs ninguno (pedagogía, que mata al fantasma solo por fórmula). Almacenaje: 5% del valor vs 0,50/u vs 0,20/u.

**Solución propuesta:** Un solo juego de parámetros salido de la simulación de economía RE-CORRIDA sobre el catálogo final de 6 productos y 2 proveedores. Los umbrales de semáforo UX se definen como % del capital inicial, no en Bs absolutos, para sobrevivir al ajuste.

### 🟠 MEDIA — Guiones pedagógicos cableados a un dataset que no es el elegido

Las 5 Hojas del Analista y los debriefs de pedagogía citan números duros de SU dataset: 'Coca promedio 42,5', 'yogurt rango 9–16', 'Don Lucho a 12,50', 'semana 5 saltó de 42 a 51'. El dataset de economía tiene otros productos y otras cifras (Gaseosa prom. 54, sin Don Lucho). Elegir un dataset invalida las hojas del otro sin que nadie lo note hasta el ensayo. Además sim.py vive en un directorio scratchpad temporal que se perderá.

**Solución propuesta:** Fijar el dataset final primero (6 productos), mover el script de calibración al repo (p. ej. tools/sim.py) con su semilla, y regenerar hojas + guion de debrief con los números finales como último paso antes de imprimir.

### 🟠 MEDIA — Tres reglas distintas para el equipo que no envía a tiempo

Pedagogía: pedido = 0 y consecuencias naturales. Mecánicas: 'piloto automático' que repite la última orden (con recorte por caja y ajuste de topes: lógica no trivial). UX: 'venden solo lo que tienen en el estante'. Son tres políticas con implementaciones y mensajes distintos.

**Solución propuesta:** Pedido 0 + venta del stock existente: es la consecuencia natural, coincide pedagogía+UX y cuesta CERO código (es el comportamiento por defecto del motor). El piloto automático se pospone a v2.1.

### 🟠 MEDIA — Máquina de estados: 3 fases en la API vs 5 en UX, y timer sin soporte

La API de arquitectura implementa open/close/reveal; el panel UX guioniza Abrir → Cerrar → Revelar demanda → Publicar resultados, más tómbola por producto y podio por barra espaciadora. Además el DDL no tiene closes_at ni autocierre server-side, pero mecánicas exige 'timer duro con cierre automático' y las duraciones difieren: 5 min (mecánicas) vs 7 (pedagogía) vs 8 (UX).

**Solución propuesta:** Mantener 3 estados. Añadir columna closes_at a rounds; countdown en cliente y autocierre disparado por la pestaña del facilitador al llegar a 0 (suficiente para un evento; un cron es sobre-ingeniería). Timer de decisión: 7 min. La 'revelación dramática' la hace el facilitador con la voz sobre una pantalla estática.

### 🟠 MEDIA — Mecánicas financieras sin soporte en esquema ni motor

El préstamo de la cooperativa (mecánicas), el crédito de proveedor Bs 1.000, los descuentos por volumen 5/10% y el fill-rate 85% con falla del 50% en R4 (economía) no existen en purchase_orders, en el pseudocódigo de engine.ts ni en el roadmap de 15 d-p (el engine solo dice 'interés de préstamo si hay'). Son 3–4 features contables extra, cada una con campos, reglas, casos borde y UI.

**Solución propuesta:** Posponer las tres. El anti-quiebra barato ya existe estructuralmente: el proveedor caro sin MOQ permite comprar de a 1 unidad con cualquier caja. Si un equipo queda literalmente en 0, el facilitador tiene el botón de editar/inyectar (o lo resuelve narrativamente: 'Doña Peta les manda Bs 200').

### 🟡 BAJA — Ruido aleatorio (±10% con semilla) vs demanda guionada

Economía introduce ε~U(−10%,+10%) por producto-ronda con semilla y re-sorteo; pedagogía y mecánicas exigen demanda guionada exacta porque cada 'aha' está calibrado para que 'duela a 5 equipos y le salga bien a 5'. El ruido agrega superficie de implementación y puede desafinar los debriefs sin aportar aprendizaje en solo 5 rondas.

**Solución propuesta:** Demanda guionada fija y editable por el facilitador antes de revelar — que además es exactamente el patrón que ya existe en el repo actual (round_secrets + updateRoundConfig). Si se quiere ruido, se hornea UNA vez en los números del guion, no en runtime.

### 🟡 BAJA — Onboarding: texto libre vs generador de nombres vs tarjetas impresas

El endpoint join de arquitectura acepta nombre libre de 2–30 chars; UX exige generador curado (~40×15 combinaciones) sin campo libre + 12 logos propios dibujados; pedagogía asume equipos pre-armados con cartel por mesa. El generador + logos son ~1.5 d-p de contenido y UI que no mueven la aguja pedagógica.

**Solución propuesta:** MVP: nombre libre con límite 20 chars, índice unique por (session, lower(name)) y botón kick del facilitador (ya diseñado) como moderación. Generador y logos: post-evento.

### 🟡 BAJA — Histórico: 5, 6 u 8 semanas según la propuesta

Pedagogía y economía usan 8 semanas (con patrones descubribles distintos: calor en S5 vs S3+quincena en S6); mecánicas da 6; UX dibuja 5. Las hojas y gráficos citan semanas concretas, y el eje X del constructor asume un rango fijo.

**Solución propuesta:** 8 semanas (mayoría y mejor base estadística), con exactamente 1 semana marcada de pico explicable, decidido junto con el dataset final.

## Recomendaciones

- Congelar HOY un 'documento de verdad única' de 1 página antes de escribir código: 6 productos con precios finales, 2 proveedores con nombres definitivos (barato/lead 1/MOQ vs caro/inmediato/sin mínimo), capital inicial y costo fijo únicos salidos de re-correr sim.py sobre ese catálogo, fórmula de puntaje absoluta (Valor Total = caja + 50% inventario al costo + 5×% servicio), regla de no-envío (pedido 0), timer 7 min. Cada lente cede algo; nadie implementa desde su propio documento.
- CORTE MVP (~9–12 días-persona, en este orden): (1) hook de datos con reconexión+polling+visibilitychange PRIMERO, 1.5 d-p; (2) schema v2 reducido —sin loans, crédito, fill-rate, badges— + seed, 1.5 d-p; (3) engine.ts puro con lotes FEFO, caja, merma, costo fijo y ≥10 tests vitest, 2 d-p; (4) store+API (join con token/reconexión, orders con validación de caja/MOQ, open/close/reveal idempotente con snapshot batch), 2 d-p; (5) UI equipo: 4 pestañas simples (Inicio KPIs, Pedido con stepper y caja en vivo, Datos con 2 presets, Podio) + tarjeta de trazabilidad como texto ('tenías 38 + llegaron 10 − vendiste 46 − se vencieron 2'), 2.5 d-p; (6) panel facilitador (demanda editable, enviados X/20, 3 botones de fase) + ruta proyector estática (timer/enviados, demanda revelada, ranking), 1.5 d-p; (7) ensayo completo, 1 d-p.
- Hacer A MANO / low-tech (cero dev, mejor pedagogía): eventos anunciados por el facilitador en voz alta + diapositiva (la app solo necesita demanda editable, patrón que ya existe en el repo); brief narrativo y las 5 Hojas del Analista impresas (ya están diseñadas para papel); tarjetas de rol impresas (la mejor idea costo/beneficio de las 4 propuestas); revelación dramática del ranking con la voz contando desde el 5º puesto; premio 'Mejor Analista' revisando hojas físicas; certificado como plantilla enviada por correo post-evento; equipo con celular muerto = dicta su pedido y cualquier otro celular entra con su token.
- POSPONER explícitamente (lista firmada para que nadie la cuele de vuelta): 13 productos, 3º y 4º proveedor, préstamo/crédito/descuentos por volumen/fill-rate, piloto automático, constructor libre de gráficos y bottom sheet arrastrable, noticias WhatsApp in-app, generador de nombres + logos, animaciones tómbola/podio, badges por ronda, certificado QR, llamada a Doña Peta, PWA offline, ruido runtime con semilla.
- Plan del día D: (a) despertar el proyecto Supabase y correr una sesión completa el día anterior (free tier pausa a los 7 días de inactividad); (b) ensayo 48h antes EN el aula real con 20 pestañas + 3 celulares gama baja bloqueando pantalla (valida la reconexión de verdad); (c) plan B de red = hotspot 4G del facilitador como wifi alternativo anotado en la mesa + capacidad de jugar 1 ronda en papel con las Hojas si la app cae 10 min; (d) anti-tormenta de realtime: el único trigger de refetch al revelar es el update de rounds.status (1 evento → 25 refetches, no 2.000 como haría el patrón v1 con results fila a fila); (e) QR + código impreso por mesa, probar el portal cautivo del wifi universitario con un celular ajeno; (f) regleta de enchufes y 2 cargadores; (g) PIN 6 dígitos + rate limit (15 líneas, barato, hacerlo); (h) el panel del facilitador es recuperable desde cualquier dispositivo con code+PIN si su laptop muere.
- Reuso del repo: conservar tal cual ~600–700 de 2.123 líneas (~30%): supabase/admin.ts, browser.ts, server/http.ts, ids.ts, participant.ts (token en localStorage), facilitator.ts, format.ts, primitivas de ui.tsx, layout/globals.css, Dockerfile/eslint/tsconfig, y sobre todo los PATRONES (tablas públicas/secretas con RLS+revoke, handler delgado→store con ApiError, motor puro sin I/O, hook con bandera cancelled). Reescribir sin nostalgia: game.ts (newsvendor mono-producto no sirve para lotes FEFO), constants.ts, types.ts, derive.ts, game.tsx, las 4 páginas, y las 8 tablas del schema. No migrar datos ni mantener compatibilidad: sala nueva, esquema nuevo, mismo proyecto Supabase.
- Si el calendario aprieta a mitad de camino, recortar en este orden: (1) proyector a una sola pantalla estática (timer + enviados); (2) un solo gráfico preset (demanda histórica); (3) fusionar close+reveal en un botón; (4) trazabilidad sin diseño, texto plano. NUNCA recortar: la robustez de red, los tests del motor, ni el ensayo general — un motor con un bug de caja delante de 100 estudiantes es el único fallo del que no se vuelve.
