# Stock Perfecto — La Tiendita de Doña Peta

Simulación competitiva de inventarios para talleres presenciales. Cada equipo
administra una tienda durante cinco semanas: analiza datos, compra a proveedores
con distintos tiempos de entrega y enfrenta demanda, quiebres, merma y costos de
almacenaje.

La aplicación está pensada para unas 20 mesas trabajando desde celulares, con un
panel privado para el facilitador y una vista de proyección para el aula.

## Qué incluye

- Registro autónomo y controlado: cada mesa crea un equipo mientras el lobby está
  abierto y recibe un código privado de recuperación.
- Cinco rondas encadenadas; no se puede saltar ni abrir dos a la vez.
- Reloj compartido con seis minutos predeterminados y autocierre. El facilitador
  puede configurar la duración general y editar cada semana antes o durante la ronda.
- Pedidos de compra con caja, múltiplos de caja, topes y lead time validados en
  el servidor.
- Compra de cero unidades registrada como una decisión válida.
- Piloto conservador en la ronda 1 si una mesa no logra enviar.
- Inventario por lotes FEFO, vencimiento, entrega parcial, reembolso, costo fijo
  y almacenaje.
- Cálculo y revelado atómicos: un fallo no deja una ronda publicada a medias y
  un doble clic no la procesa dos veces.
- Borrador del carrito guardado por equipo y ronda en el dispositivo.
- Vista unificada de inventario, compras y datos: cada producto muestra precio
  de venta, costos por proveedor, inventario, llegada exacta e historial.
- Al revelar, comparación por producto de demanda, unidades vendidas y ventas
  perdidas, tanto en unidades como en bolivianos.
- Actualización en tiempo real con sondeo de respaldo y recarga al volver a la
  pestaña.
- Onboarding breve dentro de la app y materiales imprimibles para operar sin
  improvisación.

## Stack

- Next.js 16.2 (App Router), React 19 y TypeScript
- Tailwind CSS 4 y Recharts
- Supabase: PostgreSQL, RLS y Realtime
- Vitest para el motor económico

## Puesta en marcha local

Requisitos: Node.js 20.9 o superior y Docker Desktop.

En Windows, ejecuta `run.bat`. El script instala dependencias si hace falta,
inicia Supabase, levanta la aplicación y abre el navegador.

De forma manual:

```bash
npm install
npx supabase start
npm run dev
```

Servicios locales:

| Servicio | Puerto | Dirección |
|---|---:|---|
| Aplicación | 3100 | http://localhost:3100 |
| Supabase API | 44321 | http://127.0.0.1:44321 |
| PostgreSQL | 44322 | `postgresql://…:44322` |
| Supabase Studio | 44323 | http://localhost:44323 |

Para producción, consulta [DEPLOY.md](./DEPLOY.md). Para ejecutar la aplicación
en contenedor, consulta [DOCKER.md](./DOCKER.md).

## Flujo del taller

1. El facilitador crea una sala, define el cupo y comparte el enlace o código.
2. Un representante por mesa entra en `/join`, elige nombre e integrantes y
   guarda el código privado de recuperación que recibe.
3. El facilitador revisa la lista y cierra las inscripciones; abrir R1 también las
   cierra automáticamente.
4. En cada semana, el facilitador revisa la duración y abre la ronda. Los equipos
   pueden enviar o corregir su pedido mientras el reloj siga abierto.
5. Al vencer el reloj, el panel cierra la ronda. El facilitador revela los
   resultados y conduce el debrief antes de abrir la siguiente.

La pantalla **Recuperación** contiene las credenciales privadas de los equipos ya
registrados y solo se abre desde un navegador que conserve el PIN.

## Modelo económico

La tienda comienza con Bs 800. Cada semana se cobran Bs 60 de costo fijo y
Bs 0,20 por cada unidad que queda almacenada. El motor entrega los pedidos,
consume inventario por FEFO, descuenta vencimientos y registra ventas perdidas.

El ranking usa:

```text
Valor de la Tienda =
  caja
  + 50 % del inventario vigente valorado al costo
  + Bs 5 × nivel de servicio promedio (en puntos porcentuales)
  − deuda
```

Los parámetros canónicos están en `src/lib/v2/constants.ts`; el motor puro está
en `src/lib/v2/engine.ts`.

## Seguridad y consistencia

- El navegador solo puede leer las tablas públicas necesarias para mostrar el
  juego.
- PIN, tokens, códigos privados, planes de demanda, pedidos y envíos viven en
  tablas sin acceso para `anon` ni `authenticated`.
- Las escrituras pasan por Route Handlers y usan la clave `service_role` solo en
  el servidor.
- Los reemplazos de pedidos y el revelado se ejecutan mediante funciones SQL
  transaccionales.
- El contador de mesas enviadas proviene de `order_submissions`, por lo que un
  pedido vacío también cuenta.

## Estructura relevante

```text
src/
  app/
    facilitator/              creación y control de sala
    join/                     registro y recuperación de equipos
    play/[code]/              aplicación del equipo
    proyector/[code]/         pantalla pública del aula
    api/v2/                   API vigente
  lib/v2/
    constants.ts              economía y guion canónicos
    engine.ts                 cálculo puro de una ronda
    store/                    validación y persistencia del servidor
    useGameData.ts            Realtime y sondeo de respaldo
supabase/
  schema.sql                  instalación nueva en Supabase
  migrations/                esquema versionado para Supabase CLI
tools/
  calibrate.mjs              simulación reproducible de estrategias
  smoke.mjs                  recorrido HTTP de punta a punta
docs/
  GUIA-FACILITADOR.md
  MATERIALES-IMPRIMIBLES.md
```

La API anterior a v2 fue retirada para evitar mantener dos implementaciones
incompatibles.

## Verificación

```bash
npm run lint
npm test
npm run calibrate
npm run build
```

Con Supabase local y `npm run dev` activos:

```bash
npm run smoke
```

`npm run check` ejecuta lint, pruebas unitarias, calibración y build. La prueba de
humo crea datos locales y comprueba credenciales privadas, pedido cero, piloto
R1, revelado único y orden estricto de rondas.

## Documentación

- [Plan canónico v2](./PLAN-V2.md)
- [Guía del facilitador](./docs/GUIA-FACILITADOR.md)
- [Materiales imprimibles](./docs/MATERIALES-IMPRIMIBLES.md)
- [Despliegue](./DEPLOY.md)
- [Docker](./DOCKER.md)
