# Stock Perfecto 🏪

Simulación competitiva **por rondas** del problema del *newsvendor* (vendedor de
periódicos): cada participante administra un kiosco y decide **cuántas unidades
preparar** antes de conocer la demanda real, buscando equilibrar ganancia,
sobrantes y ventas perdidas.

App web en **tiempo real**: los estudiantes se unen desde cualquier navegador con
un código de sala, el facilitador controla las rondas desde un panel y el ranking
se actualiza solo.

---

## ✨ Características

- **Sin cuentas ni contraseñas.** El facilitador crea una sala → obtiene un
  **código** y un **PIN**. Los estudiantes entran con el código y su nombre.
- **Tiempo real** (Supabase Realtime): decisiones, revelación de demanda y ranking
  se propagan al instante a todas las pantallas.
- **5 rondas con dificultad creciente de información** (configurable):
  1. Intuición · 2. Resultado previo · 3. Demanda histórica · 4. Indicadores · 5. Final.
- **Privacidad garantizada:** la demanda real y las decisiones de los demás viven
  en tablas que el navegador del estudiante **no puede leer**. Solo se publican los
  resultados al revelar la ronda.
- **Indicadores por ronda:** ganancia, acumulada, sobrantes, ventas perdidas,
  nivel de servicio y eficiencia de inventario.
- **Ranking con desempates**: mayor ganancia acumulada → menos ventas perdidas →
  menor sobrante → mejor nivel de servicio.

## 🧱 Stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript) + React 19
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (PostgreSQL + Realtime)
- Despliegue en [Vercel](https://vercel.com/)

## 📂 Estructura

```
src/
  app/
    page.tsx                 Inicio (elegir rol)
    join/                    Unirse a una sala (participante)
    play/[code]/             Pantalla de juego del participante
    facilitator/             Crear sala
    facilitator/[code]/      Panel de control (protegido por PIN)
    api/                     Route handlers (escrituras con service role)
      sessions/ join/ decisions/ facilitator/state/
      rounds/{open,close,reveal,update}/
  lib/
    game.ts                  Lógica pura (fórmulas, ranking)
    constants.ts             Parámetros y plantillas de las 5 rondas
    derive.ts                Derivaciones para la UI (ranking, historial)
    useSessionData.ts        Hook de datos públicos + suscripción Realtime
    server/store.ts          Acceso a datos con service role (todas las escrituras)
    supabase/{browser,admin}.ts  Clientes Supabase
  components/                UI (ui.tsx) y componentes del juego (game.tsx)
supabase/
  schema.sql                 Esquema completo (tablas, RLS, grants, Realtime)
  migrations/                Misma definición como migración para el CLI de Supabase
```

## 🚀 Puesta en marcha (local)

Necesitas **Node 20.9+**. Tienes dos caminos para la base de datos:

### ⚡ Windows en un clic

- **`run.bat`** — levanta todo: verifica Docker, inicia Supabase local, elige un
  puerto libre, arranca la app y abre el navegador.
- **`stop.bat`** — apaga todo (Supabase local y contenedores).

Solo la primera vez: al terminar `supabase start`, copia las llaves a `.env.local`
(ver [`.env.local.example`](./.env.local.example)) y vuelve a ejecutar `run.bat`.

### Opción A — Supabase en la nube (recomendado para el evento)

Sigue [`DEPLOY.md`](./DEPLOY.md): crea el proyecto, ejecuta `supabase/schema.sql`
y copia las llaves a `.env.local`.

### Opción B — Supabase local (requiere Docker)

```bash
npm install
npx supabase start          # levanta Postgres + Realtime y aplica migrations/
```

Copia las llaves que imprime `supabase start` a `.env.local`
(ver [`.env.local.example`](./.env.local.example)):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

Luego:

```bash
npm run dev                 # http://localhost:3000
```

Para detener Supabase local: `npx supabase stop`.

### 🐳 Con Docker

La app también corre containerizada (imagen *standalone* + `docker compose`).
Ver [`DOCKER.md`](./DOCKER.md):

```bash
cp .env.docker.example .env      # completa las llaves
docker compose up --build
```

## 🎮 Cómo se juega

1. **Facilitador:** entra a `/facilitator`, crea la sala y anota el **código** y el
   **PIN**. Comparte el código (o el enlace `/join?code=XXXX`) con los estudiantes.
2. **Participantes:** entran a `/join`, ponen el código y su nombre.
3. **Facilitador** (en `/facilitator/CÓDIGO`): por cada ronda →
   **Abrir** ▸ los estudiantes envían su cantidad ▸ **Cerrar** ▸
   **Revelar demanda y resultados**. Avanza a la siguiente ronda.
4. Tras la última ronda se corona al ganador por **ganancia acumulada**.

## 🧮 Fórmulas (por ronda)

```
vendidas   = min(preparadas, demanda_real)
sobrantes  = preparadas − vendidas
perdidas   = demanda_real − vendidas
ingreso    = vendidas   × precio
recuperado = sobrantes  × valor_recuperación
costo      = preparadas × costo_unitario
ganancia   = ingreso + recuperado − costo
nivel_servicio        = vendidas / demanda_real
eficiencia_inventario = vendidas / preparadas
```

## 🔒 Modelo de privacidad

- **Tablas públicas** (lectura anónima + Realtime): `sessions`, `rounds`,
  `participants`, `results`. La demanda real de una ronda es `NULL` hasta revelarla.
- **Tablas secretas** (solo el servidor con *service role*): `round_secrets`
  (demanda planificada), `decisions` (cantidades enviadas), `participant_secrets`
  (tokens), `session_secrets` (PIN).
- **Todas las escrituras** pasan por los *route handlers* del servidor. El
  navegador solo lee datos públicos y se suscribe a cambios.

## ✅ Verificación

- Lógica del juego validada con los casos del enunciado (ganancia Bs 250,
  nivel de servicio 86 %).
- Prueba end-to-end del flujo completo (crear → unirse → abrir → enviar → cerrar →
  revelar → ranking), incluyendo controles de privacidad, autenticación y entrega
  de eventos por Realtime.

## 📜 Scripts

```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # eslint
```
