# ARQUITECTURA TÉCNICA Y MODELO DE DATOS — Stock Perfecto v2 ("La Tienda de Barrio")

Supuestos declarados: taller ~2h, 20 equipos (3–5 chicos, 1 celular por equipo), facilitador + proyector = ~25 clientes concurrentes; stack se mantiene (Next.js 16 / React 19 / Tailwind v4 / Supabase free tier / Vercel); las 5 rondas representan 5 "semanas" de operación de la tienda; moneda Bs.

---

## 1. VEREDICTO: conservar vs reescribir, módulo por módulo

El repo actual es pequeño (~2.000 líneas de app), compila y tiene una capa de infraestructura sana. La regla general: **se conserva toda la "cañería", se reescribe todo el "dominio"**.

| Archivo / módulo | Veredicto | Justificación |
|---|---|---|
| `supabase/schema.sql` | **REESCRIBIR** (v2 abajo) | El dominio cambia entero. Se conserva el *patrón*: públicas vs secretas, RLS sin políticas en secretas + `revoke`, Realtime solo en públicas, `replica identity full`. |
| `src/lib/supabase/admin.ts` | **CONSERVAR tal cual** | Singleton service-role con `server-only`, correcto. |
| `src/lib/supabase/browser.ts` | **CONSERVAR tal cual** | Cliente anon. |
| `src/lib/server/http.ts` | **CONSERVAR tal cual** | `readJson` + `toErrorResponse` + `ApiError` sirven igual. |
| `src/lib/ids.ts` | **CONSERVAR + ampliar** | Mantener alfabeto sin ambiguos. Cambiar `generatePin()` a 6 dígitos (ver riesgos). |
| `src/lib/server/store.ts` | **REESCRIBIR** (misma forma) | La *estructura* (funciones por caso de uso, `verifyFacilitator`, `verifyParticipant`→`verifyTeam`, ApiError con status) se replica; el contenido es dominio nuevo. Separar en `store/` (sessions.ts, orders.ts, rounds.ts, facilitator.ts) porque crecerá 3–4×. |
| `src/lib/game.ts` | **REESCRIBIR → `src/lib/engine.ts`** | Mantener la decisión de diseño clave: **función pura sin I/O, testeable**, usada solo en servidor para cierre. `computeIndicators` se conserva casi igual (sirve para la pestaña de análisis). |
| `src/lib/constants.ts` | **REESCRIBIR** | Ahora contiene el SEED completo: catálogo de productos, proveedores, ofertas, plantillas de rondas/eventos, plan de demanda por defecto, parámetros económicos. |
| `src/lib/types.ts` | **REESCRIBIR** | Refleja el esquema v2. |
| `src/lib/useSessionData.ts` | **REESCRIBIR conservando el patrón** | El patrón (carga inicial + suscripción + bandera `cancelled`) es bueno, pero hay que añadir: reconexión, polling de respaldo, refetch en `visibilitychange`/`online`, debounce de refetch, y 5 tablas más. Es el archivo más crítico para el evento (ver §8). |
| `src/lib/derive.ts` | **REESCRIBIR** | Derivaciones nuevas (ranking por score, series para gráficos). Mismo rol: puro, cliente. |
| `src/lib/participant.ts` | **CONSERVAR renombrado → `team.ts`** | Mismo mecanismo localStorage `sp:team:{code}`. |
| `src/lib/facilitator.ts`, `format.ts` | **CONSERVAR** | `format.ts` gana `formatBs()`. |
| `src/app/api/*` (8 handlers) | **REESCRIBIR** (triviales, 13–25 líneas c/u) | El patrón handler-delgado → store se mantiene idéntico. |
| `src/app/join`, `play/[code]`, `facilitator/*` | **REESCRIBIR UI** | El juego cambia entero. Conservar layout, `globals.css`, `ui.tsx` (primitivas: Card, Button, Stat) como base. |
| `src/components/game.tsx` | **REESCRIBIR** | Dominio nuevo. |
| Dockerfile, deploy, eslint, tsconfig | **CONSERVAR** | Nada que tocar. |

**Decisión estructural nueva**: agregar `vitest` (dev-dependency única nueva junto a la librería de gráficos) para testear `engine.ts`. Hoy no hay ni un test y el motor v2 es 10× más complejo que `computeOutcome`.

---

## 2. ESQUEMA SQL v2 (DDL completo, idempotente, listo para el SQL Editor de Supabase)

Modelo de visibilidad (misma filosofía v1):

- **PÚBLICAS** (anon SELECT + Realtime): `sessions`, `rounds`, `teams`, `products`, `suppliers`, `supplier_offers`, `history_weeks`, `inventory_lots`, `inventory_moves`, `kpi_snapshots`.
- **SECRETAS** (sin políticas anon + revoke; solo service_role): `session_secrets`, `team_secrets`, `demand_plan`, `round_plans`, `purchase_orders`.
- Regla anti-trampa: nada que revele el futuro (demanda, eventos aún no abiertos, pedidos de otros equipos en la ronda en curso) vive en tabla pública. Los pedidos se **publican como movimientos de inventario al revelar** (trazabilidad pública ex-post, secreto ex-ante).
- Semántica de lead time: pedido colocado en ronda R con lead L **llega y se puede vender en la ronda R+L** (L=0 = entrega express, disponible esa misma ronda). Se paga **al pedir** (enseña restricción de capital).

```sql
-- ============================================================================
-- Stock Perfecto v2 — "La Tienda de Barrio" (Supabase / PostgreSQL)
-- Públicas:  sessions, rounds, teams, products, suppliers, supplier_offers,
--            history_weeks, inventory_lots, inventory_moves, kpi_snapshots
-- Secretas:  session_secrets, team_secrets, round_plans, demand_plan,
--            purchase_orders
-- ============================================================================
create extension if not exists pgcrypto;

-- ------------------------------------------------------------- sessions (PUB)
create table if not exists public.sessions (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique,
  name                  text not null default 'La Tienda de Barrio',
  currency              text not null default 'Bs',
  status                text not null default 'lobby'
                          check (status in ('lobby','running','finished')),
  current_round         integer not null default 0,
  total_rounds          integer not null default 5,
  starting_cash         numeric not null default 800,   -- Bs por equipo
  fixed_cost_per_round  numeric not null default 60,    -- alquiler+luz por semana
  holding_cost_per_unit numeric not null default 0.20,  -- Bs por unidad que queda en estante
  history_seed          integer not null default 0,     -- semilla RNG de las 8 semanas
  created_at            timestamptz not null default now()
);

create table if not exists public.session_secrets (      -- SECRETA
  session_id          uuid primary key references public.sessions(id) on delete cascade,
  facilitator_pin     text not null,                     -- ahora 6 dígitos
  failed_pin_attempts integer not null default 0,
  locked_until        timestamptz                        -- rate limiting del PIN
);

-- -------------------------------------------------------------- products (PUB)
-- Catálogo POR SESIÓN, copiado del seed global al crear (el facilitador puede
-- ajustar precios sin afectar otras salas).
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.sessions(id) on delete cascade,
  sku               text not null,            -- 'REFRESCO2L'
  name              text not null,            -- 'Refresco 2L'
  emoji             text not null default '📦',
  category          text not null default 'abarrotes',
  sale_price        numeric not null,         -- precio de venta al público (Bs)
  shelf_life_rounds integer,                  -- NULL = no perecedero; 1 = solo esa semana
  starting_stock    integer not null default 0, -- inventario inicial del equipo
  sort_order        integer not null default 0,
  unique (session_id, sku)
);
create index if not exists products_session_idx on public.products(session_id);

-- ------------------------------------------------------------- suppliers (PUB)
create table if not exists public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  name        text not null,
  blurb       text not null default '',        -- descripción para el brief
  sort_order  integer not null default 0
);
create index if not exists suppliers_session_idx on public.suppliers(session_id);

create table if not exists public.supplier_offers (      -- PUB: los chicos ANALIZAN esto
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.sessions(id) on delete cascade,
  supplier_id      uuid not null references public.suppliers(id) on delete cascade,
  product_id       uuid not null references public.products(id) on delete cascade,
  unit_cost        numeric not null,
  moq              integer not null default 1,   -- cantidad mínima de pedido
  pack_size        integer not null default 1,   -- se pide en múltiplos de esto
  lead_time_rounds integer not null default 1,   -- 0 = llega esta misma ronda
  unique (supplier_id, product_id)
);
create index if not exists offers_session_idx on public.supplier_offers(session_id);

-- ----------------------------------------------------------------- teams (PUB)
create table if not exists public.teams (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  name         text not null,
  member_names text[] not null default '{}',   -- nombres de los 3-5 integrantes
  color        text not null default '#0ea5e9',
  cash         numeric not null default 0,     -- actualizado SOLO al revelar
  score_total  numeric not null default 0,     -- ídem
  created_at   timestamptz not null default now()
);
create index if not exists teams_session_idx on public.teams(session_id);
-- Evita equipos duplicados al reingresar (bug v1):
create unique index if not exists teams_session_name_uq
  on public.teams(session_id, lower(name));

create table if not exists public.team_secrets (          -- SECRETA
  team_id uuid primary key references public.teams(id) on delete cascade,
  token   text not null unique
);

-- ---------------------------------------------------------------- rounds (PUB)
create table if not exists public.rounds (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.sessions(id) on delete cascade,
  round_number      integer not null,           -- 1..5 ("semana 1..5")
  title             text not null default '',
  status            text not null default 'pending'
                      check (status in ('pending','open','closed','revealed')),
  -- El evento narrativo se COPIA aquí desde round_plans al ABRIR la ronda
  -- (antes de abrir es secreto; una tabla pública filtrada por columna es trampeable).
  event_headline    text,
  event_description text,
  event_icon        text,
  opened_at         timestamptz,
  closed_at         timestamptz,
  revealed_at       timestamptz,
  unique (session_id, round_number)
);
create index if not exists rounds_session_idx on public.rounds(session_id);

create table if not exists public.round_plans (            -- SECRETA
  round_id          uuid primary key references public.rounds(id) on delete cascade,
  event_headline    text,          -- se publica al abrir
  event_description text,
  event_icon        text,
  facilitator_notes text           -- guion pedagógico, jamás se publica
);

create table if not exists public.demand_plan (            -- SECRETA
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  round_id     uuid not null references public.rounds(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  planned_demand integer not null check (planned_demand >= 0),
  unique (round_id, product_id)    -- NOT NULL + unique => nunca "demanda vacía"
);
create index if not exists demand_plan_round_idx on public.demand_plan(round_id);

-- -------------------------------------------------------- purchase_orders (SEC)
-- Secreta mientras la ronda está abierta (nadie ve qué pide el rival).
-- Su efecto se publica al revelar vía inventory_moves / kpi_snapshots.
create table if not exists public.purchase_orders (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.sessions(id) on delete cascade,
  team_id          uuid not null references public.teams(id) on delete cascade,
  round_id         uuid not null references public.rounds(id) on delete cascade,
  placed_round     integer not null,
  offer_id         uuid not null references public.supplier_offers(id),
  supplier_id      uuid not null references public.suppliers(id),
  product_id       uuid not null references public.products(id),
  qty              integer not null check (qty > 0),
  unit_cost        numeric not null,             -- congelado al pedir
  total_cost       numeric not null,
  lead_time_rounds integer not null,
  arrives_round    integer not null,             -- placed_round + lead
  status           text not null default 'pending'
                     check (status in ('pending','delivered','cancelled')),
  created_at       timestamptz not null default now(),
  unique (team_id, round_id, offer_id)           -- upsert: re-enviar reemplaza
);
create index if not exists po_round_idx   on public.purchase_orders(round_id);
create index if not exists po_team_idx    on public.purchase_orders(team_id);
create index if not exists po_arrival_idx on public.purchase_orders(session_id, arrives_round, status);

-- ---------------------------------------------------------- inventory_lots (PUB)
-- Estado del inventario por lote (trazabilidad: de qué pedido vino, cuándo vence).
-- El motor lo actualiza SOLO al revelar; entre rondas es una foto estable.
create table if not exists public.inventory_lots (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.sessions(id) on delete cascade,
  team_id            uuid not null references public.teams(id) on delete cascade,
  product_id         uuid not null references public.products(id) on delete cascade,
  acquired_round     integer not null,           -- 0 = stock inicial
  qty_initial        integer not null,
  qty_remaining      integer not null,
  unit_cost          numeric not null,
  source             text not null default 'order' check (source in ('initial','order')),
  order_id           uuid references public.purchase_orders(id),
  expires_after_round integer,                   -- NULL = no vence
  created_at         timestamptz not null default now()
);
create index if not exists lots_team_idx on public.inventory_lots(team_id, product_id);
create index if not exists lots_session_idx on public.inventory_lots(session_id);

-- --------------------------------------------------------- inventory_moves (PUB)
-- Ledger de movimientos, publicado al revelar cada ronda. Base de la trazabilidad.
create table if not exists public.inventory_moves (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  team_id      uuid not null references public.teams(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  lot_id       uuid references public.inventory_lots(id),
  round_number integer not null,
  type         text not null check (type in ('initial','arrival','sale','spoilage')),
  qty          integer not null,                 -- siempre positivo; type da el signo
  created_at   timestamptz not null default now()
);
create index if not exists moves_team_idx on public.inventory_moves(team_id, round_number);
create index if not exists moves_session_idx on public.inventory_moves(session_id);

-- ---------------------------------------------------------- kpi_snapshots (PUB)
-- Una fila por equipo × ronda, escrita al revelar. Base de ranking y gráficos.
create table if not exists public.kpi_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.sessions(id) on delete cascade,
  team_id            uuid not null references public.teams(id) on delete cascade,
  round_id           uuid not null references public.rounds(id) on delete cascade,
  round_number       integer not null,
  -- flujo de la ronda
  revenue            numeric not null,
  purchases_cash_out numeric not null,   -- pagado a proveedores esta ronda
  cogs               numeric not null,   -- costo de lo vendido (económico)
  holding_cost       numeric not null,
  fixed_cost         numeric not null,
  spoilage_units     integer not null,
  spoilage_cost      numeric not null,
  -- demanda y servicio
  demand_total       integer not null,
  units_sold         integer not null,
  lost_sales         integer not null,
  service_level      numeric not null,   -- 0..1
  sell_through       numeric not null,   -- vendido / disponible
  -- posición al cierre
  stock_end_units    integer not null,
  stock_end_value    numeric not null,
  cash_start         numeric not null,
  cash_end           numeric not null,
  profit_round       numeric not null,   -- económico: revenue - cogs - merma - holding - fijo
  profit_cumulative  numeric not null,
  -- puntuación
  score_round        numeric not null,
  score_total        numeric not null,
  created_at         timestamptz not null default now(),
  unique (team_id, round_id)
);
create index if not exists kpi_session_idx on public.kpi_snapshots(session_id);
create index if not exists kpi_team_idx on public.kpi_snapshots(team_id, round_number);

-- ----------------------------------------------------------- history_weeks (PUB)
-- Las "8 semanas previas" de la tienda: mismas columnas que necesita el gráfico
-- de ventas, para que historia y rondas se concatenen sin transformación.
create table if not exists public.history_weeks (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  week_number integer not null,          -- -8 .. -1 (negativo = pasado)
  product_id  uuid not null references public.products(id) on delete cascade,
  units_sold  integer not null,
  lost_sales  integer not null default 0,
  note        text,                       -- 'feria del barrio', 'semana de lluvia'
  unique (session_id, week_number, product_id)
);
create index if not exists history_session_idx on public.history_weeks(session_id);

-- ============================================================================
-- RLS (patrón v1 conservado)
-- ============================================================================
alter table public.sessions         enable row level security;
alter table public.session_secrets  enable row level security;
alter table public.products         enable row level security;
alter table public.suppliers        enable row level security;
alter table public.supplier_offers  enable row level security;
alter table public.teams            enable row level security;
alter table public.team_secrets     enable row level security;
alter table public.rounds           enable row level security;
alter table public.round_plans      enable row level security;
alter table public.demand_plan      enable row level security;
alter table public.purchase_orders  enable row level security;
alter table public.inventory_lots   enable row level security;
alter table public.inventory_moves  enable row level security;
alter table public.kpi_snapshots    enable row level security;
alter table public.history_weeks    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['sessions','products','suppliers','supplier_offers',
    'teams','rounds','inventory_lots','inventory_moves','kpi_snapshots','history_weeks']
  loop
    execute format('drop policy if exists "public read %1$s" on public.%1$I', t);
    execute format(
      'create policy "public read %1$s" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format('grant select on public.%1$I to anon, authenticated', t);
  end loop;
end $$;

-- Secretas: sin políticas + revoke explícito (solo service_role, que bypassa RLS).
revoke all on public.session_secrets  from anon, authenticated;
revoke all on public.team_secrets     from anon, authenticated;
revoke all on public.round_plans      from anon, authenticated;
revoke all on public.demand_plan      from anon, authenticated;
revoke all on public.purchase_orders  from anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ============================================================================
-- Realtime: SOLO las públicas que cambian durante el juego.
-- (products/suppliers/offers/history son estáticas post-creación: no publicarlas
--  reduce ruido en el pool de mensajes del free tier.)
-- ============================================================================
alter table public.sessions        replica identity full;
alter table public.rounds          replica identity full;
alter table public.teams           replica identity full;
alter table public.kpi_snapshots   replica identity full;

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['sessions','rounds','teams','kpi_snapshots'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname='supabase_realtime' and schemaname='public' and tablename=t
      ) then execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
```

Nota deliberada: `inventory_lots` e `inventory_moves` **no** están en Realtime — solo cambian en el instante del reveal, y el cliente ya refetchea al ver `rounds.status='revealed'` (un solo evento dispara una sola recarga; ver §8 tormenta de recargas).

### Seed concreto (vive en `constants.ts`, se inserta por sesión al crearla)

**Catálogo (6 productos de tienda de barrio, Bs):**

| SKU | Producto | Precio venta | Vida útil (rondas) | Stock inicial | Rol pedagógico |
|---|---|---|---|---|---|
| REFRESCO2L | Refresco 2L | 13.00 | — | 20 | Alta rotación, estable |
| PAN | Pan de batalla (unidad) | 0.50 | 1 | 80 | Perecedero extremo, volumen |
| LECHE1L | Leche PIL 1L | 7.00 | 2 | 24 | Perecedero medio |
| HUEVO30 | Maple de huevos (30 u) | 28.00 | 3 | 6 | Ticket alto, MOQ |
| GALLETA | Galletas surtidas | 3.00 | — | 30 | Margen alto, demanda volátil |
| DETERG | Detergente 400 g | 11.00 | — | 10 | Baja rotación: trampa de sobre-stock |

**Proveedores y ofertas (costo unitario / MOQ / pack / lead):**

| Producto | Mayorista "La Ramada" (barato, lento, por volumen) | Distribuidor "Don Pepe" (equilibrado) | "Entrega Express SRL" (caro, inmediato) |
|---|---|---|---|
| Refresco 2L | 9.50 / MOQ 24 / pack 12 / lead 1 | 10.50 / MOQ 6 / pack 6 / lead 1 | 12.00 / MOQ 1 / pack 1 / lead 0 |
| Pan | — (no vende) | 0.35 / MOQ 30 / pack 10 / lead 1 | 0.42 / MOQ 10 / pack 10 / lead 0 |
| Leche 1L | 5.20 / MOQ 24 / pack 12 / lead 1 | 5.60 / MOQ 6 / pack 6 / lead 1 | 6.30 / MOQ 1 / pack 1 / lead 0 |
| Maple huevos | 21.00 / MOQ 6 / pack 3 / lead 1 | 23.00 / MOQ 2 / pack 1 / lead 1 | 25.50 / MOQ 1 / pack 1 / lead 0 |
| Galletas | 1.80 / MOQ 40 / pack 20 / lead 1 | 2.10 / MOQ 10 / pack 10 / lead 1 | 2.50 / MOQ 5 / pack 5 / lead 0 |
| Detergente | 7.50 / MOQ 12 / pack 12 / lead 1 | 8.20 / MOQ 4 / pack 4 / lead 1 | 9.50 / MOQ 1 / pack 1 / lead 0 |

**Parámetros económicos**: caja inicial 800 Bs, costo fijo 60 Bs/ronda, almacenaje 0.20 Bs/unidad remanente/ronda. Con estos números un equipo pasivo pierde ~60–75 Bs por ronda (arregla el bug del "gano no jugando").

---

## 3. MOTOR DE SIMULACIÓN — `engine.ts`, función pura de cierre de ronda

Un solo punto de entrada, sin I/O, determinista, testeable con vitest. `store/rounds.ts#revealRound` carga todo, llama al motor, y persiste el output en una pasada.

```
// ---------- Tipos de entrada (todo plano, serializable) ----------
EngineConfig   = { fixedCostPerRound, holdingCostPerUnit,
                   scoreWeights: { profit: 0.5, service: 0.3, waste: 0.2 } }
ProductIn      = { id, salePrice, shelfLifeRounds|null }
LotIn          = { id, teamId, productId, qtyRemaining, unitCost, expiresAfterRound|null, acquiredRound }
OrderIn        = { id, teamId, productId, qty, unitCost, totalCost, placedRound, arrivesRound }
TeamIn         = { id, cashEnd_prev, profitCum_prev, scoreTotal_prev }
DemandIn       = Map<productId, plannedDemand>          // igual para todos los equipos

closeRoundEngine(roundNumber, config, products, teams, lots, orders, demand)
  -> { teams: TeamOutcome[], lotPatches, newLots, moves, kpiRows, deliveredOrderIds }

// ---------- Algoritmo ----------
function closeRoundEngine(R, cfg, products, teams, lots, orders, demand):
  outcomes = []
  for team in teams:                                  # independiente por equipo
    myLots   = lots.filter(teamId == team.id)         # copia mutable local
    myOrders = orders.filter(teamId == team.id)

    # 1) LLEGADAS: pedidos con arrivesRound == R se vuelven lotes nuevos
    arrivals = myOrders.filter(o.arrivesRound == R && o.status == 'pending')
    for o in arrivals:
      lot = { productId: o.productId, qtyInitial: o.qty, qtyRemaining: o.qty,
              unitCost: o.unitCost, acquiredRound: R, orderId: o.id,
              expiresAfterRound: shelfLife(o.productId) ? R + shelfLife - 1 : null }
      myLots.push(lot);  moves.push({type:'arrival', qty:o.qty, lot, round:R})

    # 2) CAJA SALIENTE: se paga lo PEDIDO en esta ronda (pago al pedir)
    purchasesCashOut = sum(o.totalCost for o in myOrders if o.placedRound == R)

    # 3) DEMANDA Y VENTAS (por producto, FEFO: primero lo que vence antes)
    revenue = cogs = 0; unitsSold = lostSales = demandTotal = 0
    for p in products:
      D = demand.get(p.id) ?? FAIL          # el motor EXIGE demanda para todos
      demandTotal += D
      lotsP = myLots.filter(productId==p.id && qtyRemaining>0)
                    .sortBy(expiresAfterRound ?? +inf, acquiredRound)   # FEFO
      remaining = D
      for lot in lotsP while remaining > 0:
        take = min(lot.qtyRemaining, remaining)
        lot.qtyRemaining -= take; remaining -= take
        revenue += take * p.salePrice; cogs += take * lot.unitCost
        unitsSold += take; moves.push({type:'sale', qty:take, lot, round:R})
      lostSales += remaining                # no hay backorders: venta perdida

    # 4) MERMA: lotes vencidos (expiresAfterRound == R) tras vender
    spoilageUnits = spoilageCost = 0
    for lot in myLots where lot.expiresAfterRound == R && lot.qtyRemaining > 0:
      spoilageUnits += lot.qtyRemaining
      spoilageCost  += lot.qtyRemaining * lot.unitCost
      moves.push({type:'spoilage', qty:lot.qtyRemaining, lot, round:R})
      lot.qtyRemaining = 0

    # 5) COSTO DE ALMACENAJE sobre lo que queda + COSTO FIJO
    stockEndUnits = sum(lot.qtyRemaining)
    stockEndValue = sum(lot.qtyRemaining * lot.unitCost)
    holdingCost   = stockEndUnits * cfg.holdingCostPerUnit
    fixedCost     = cfg.fixedCostPerRound

    # 6) CAJA Y GANANCIA (dos vistas: caja ≠ ganancia, a propósito)
    cashStart = team.cashEnd_prev
    cashEnd   = cashStart + revenue - purchasesCashOut - holdingCost - fixedCost
    profit    = revenue - cogs - spoilageCost - holdingCost - fixedCost
    profitCum = team.profitCum_prev + profit

    # 7) KPIs
    serviceLevel = demandTotal > 0 ? unitsSold / demandTotal : 1
    available    = unitsSold + stockEndUnits + spoilageUnits
    sellThrough  = available > 0 ? unitsSold / available : 0

    outcomes.push({ ...todo lo anterior })

  # 8) PUNTUACIÓN (relativa a la cohorte: necesita todos los outcomes)
  pMin = min(o.profit), pMax = max(o.profit)
  for o in outcomes:
    profitNorm = pMax > pMin ? (o.profit - pMin) / (pMax - pMin) : 1
    wasteRatio = o.available > 0 ? o.spoilageUnits / o.available : 0
    o.scoreRound = round(100 * ( cfg.w.profit  * profitNorm
                               + cfg.w.service * o.serviceLevel
                               + cfg.w.waste   * (1 - wasteRatio) ), 1)
    o.scoreTotal = team.scoreTotal_prev + o.scoreRound

  return assemble(outcomes)   # kpiRows, lotPatches, newLots, moves, deliveredOrderIds
```

**Persistencia (en `revealRound`, orden importa):** 1) update `rounds.status` `'closed'→'revealed'` **con guarda condicional** (`.eq('status','closed')` y verificando fila afectada → idempotente ante doble clic); 2) insert `inventory_lots` nuevos + update `qty_remaining` de los tocados; 3) insert batch `inventory_moves`; 4) update `purchase_orders` entregadas → `'delivered'`; 5) upsert batch `kpi_snapshots`; 6) update `teams.cash`/`score_total`; 7) si `R == total_rounds` → `sessions.status='finished'`. El update de `rounds` va al final en v1; en v2 va **primero como lock optimista** y el resto es re-ejecutable (upserts) si algo falla a medias.

**Tests mínimos del motor (vitest):** llegada con lead 1 disponible en R+1; lead 0 vende misma ronda; FEFO consume lote que vence antes; merma exacta al vencer; equipo pasivo pierde `fixed+holding`; caja vs ganancia difieren cuando hay pedido sin llegar; score normalizado con cohorte de 1 equipo no divide por cero; demanda faltante lanza error (nunca 0 silencioso).

---

## 4. SEED DE HISTÓRICOS ("8 semanas previas")

- **Tabla propia** (`history_weeks`), NO rondas falsas: las rondas tienen estado/ciclo de vida y contaminarían `current_round`, ranking y Realtime. Pero **misma forma de serie** que lo que sale de `kpi_snapshots`/`inventory_moves` (semana × producto × unidades), así el cliente concatena `[-8..-1]` + `[1..5]` en un mismo eje X sin transformación.
- **Una sola historia por sesión, compartida por todos los equipos** (todos "heredan la misma tienda"): es justo, comparable, y son solo 8 × 6 = **48 filas por sesión**.
- **Determinista con semilla por sesión**: al crear la sesión se genera `history_seed = randomInt(2^31)` y se corre un PRNG `mulberry32(seed)` en el servidor. Mismo seed ⇒ misma historia (reproducible para debug y ensayo). Las filas se **materializan** en la tabla (no se recalculan en el cliente): el cliente solo lee.
- **Generador** (en `constants.ts`/`seedHistory.ts`, puro): por producto, `media_semanal` base (Refresco 45, Pan 150, Leche 30, Huevos 8, Galletas 35, Detergente 6), ruido uniforme ±20%, tendencia +1.5%/semana, y dos semanas marcadas: semana −5 `note='Feria del barrio'` (×1.35 en refresco/galletas) y semana −2 `note='Semana de lluvia'` (×0.8 en refresco). `lost_sales` = 10% de las semanas con un faltante pequeño, para poder hablar de quiebres de stock desde el minuto 1.
- El plan de demanda por defecto de las rondas 1–5 se genera con el **mismo generador y la misma media** (continuidad estadística: analizar la historia SÍ ayuda a predecir), con los eventos de ronda desviándolo (p. ej. R3 "Partido de la selección": refresco ×1.6).

---

## 5. API ROUTES v2

Todas POST-only salvo indicación, body JSON, respuesta `{...}` o `{error}` con status del `ApiError`. Handler delgado → `store/*`. Caller: **F** = facilitador (UI), **E** = equipo (UI), ambos client-side fetch.

| # | Método y path | Body | Caller | Valida |
|---|---|---|---|---|
| 1 | `POST /api/sessions` | `{name?, pin?, totalRounds?, economics?{startingCash,fixedCost,holdingCost}}` | F | clamps; genera code único, PIN 6 dígitos, seed; inserta catálogo+proveedores+ofertas+rondas+round_plans+demand_plan+history_weeks en batch (una transacción lógica; ~200 filas) |
| 2 | `POST /api/join` | `{code, teamName, members: string[], token?}` | E | sala existe y `status!='finished'`; nombre 2–30 chars; si `token` válido para un equipo de esa sala → **reconecta** (devuelve identidad existente, no duplica); si nombre ya existe sin token → 409 "ese equipo ya existe, ¿son ustedes? pidan el código al facilitador" (fix duplicados); crea lotes iniciales (`source='initial'`, ronda 0) y move `initial` |
| 3 | `POST /api/teams/state` | `{code, teamId, token}` | E | token; devuelve estado **privado propio**: pedidos pendientes/en tránsito, caja disponible (= `teams.cash` − pedidos colocados en la ronda abierta) — espejo del patrón `facilitator/state` |
| 4 | `POST /api/orders` | `{code, teamId, token, roundId, orders: [{offerId, qty}]}` | E | token; ronda `open` y de su sala; cada oferta existe y es de la sesión; `qty ≥ MOQ` y múltiplo de `pack_size`; `qty ≤ 5000`; **Σ total_cost ≤ caja disponible**; semántica *replace-all de la ronda* (borra pendientes de ese equipo+ronda y re-inserta; upsert por `(team_id, round_id, offer_id)`) — reenviar corrige, como v1 |
| 5 | `POST /api/rounds/open` | `{code, pin, roundNumber}` | F | PIN (con rate-limit, §8); ronda `pending` **o** `closed`→no (solo `pending`); **precondición: existe `demand_plan` para TODOS los productos de esa ronda, si no 409** (fix demanda vacía); copia evento de `round_plans` → columnas públicas de `rounds`; `sessions.current_round=n, status='running'` |
| 6 | `POST /api/rounds/close` | `{code, pin, roundNumber}` | F | PIN; ronda `open`; congela pedidos (los POST /api/orders posteriores fallan con 409) |
| 7 | `POST /api/rounds/reveal` | `{code, pin, roundNumber}` | F | PIN; ronda `closed`; re-valida demand_plan completo; corre `closeRoundEngine`; persiste (ver §3); **idempotente** ante doble clic (update condicional por status) |
| 8 | `POST /api/rounds/update` | `{code, pin, roundNumber, patch:{demands?: [{productId, planned}], event?{headline,description,icon}, title?}}` | F | PIN; ronda no `revealed`; escribe `demand_plan` y `round_plans` |
| 9 | `POST /api/facilitator/state` | `{code, pin}` | F | PIN; devuelve todo + secretos: plan de demanda, pedidos por equipo de la ronda en curso (cuántos equipos ya pidieron), eventos futuros |
| 10 | `POST /api/facilitator/kick` | `{code, pin, teamId}` | F | PIN; borra equipo (cascade) — herramienta anti-duplicados/troll en vivo |

Sin cambios: los datos públicos NO tienen endpoint — van por supabase-js anon + Realtime como hoy.

---

## 6. GRÁFICOS EN EL CLIENTE

**Recomendación: Recharts 3.x** (soporta React 19; con Tailwind convive sin fricción).

- **Por qué no visx**: modular y liviano, pero el costo en días-persona de armar ejes/tooltips/leyendas a mano no cabe antes del evento.
- **Por qué no SVG propio para todo**: sí para *sparklines* (30 líneas de código, cero deps) en tarjetas de KPI; no para los 4–5 gráficos interactivos del taller.
- **Bundle en celular de gama media**: Recharts pesa ~100 kB gz. Mitigación: cargarlo **solo en la pestaña "Analiza"** con `next/dynamic({ ssr: false })` → chunk separado que no bloquea el flujo crítico (unirse, pedir). El resto de la app queda liviano. Con wifi de aula se descarga una vez y queda en caché.
- **Los datos ya alcanzan con `useSessionData` ampliado**: el volumen total de una sesión es minúsculo — 48 filas de historia + ≤600 `kpi_snapshots` (20 equipos × 5 rondas... son 100) + ~700 `inventory_moves` + catálogo. Todo cabe en memoria del cliente sin paginación ni agregación server-side. `useSessionData` v2 carga además `products`, `suppliers`, `supplier_offers`, `history_weeks` (una vez, sin Realtime) y `kpi_snapshots` (con Realtime vía trigger de `rounds`).

**Constructor de gráficos (pestaña "Analiza")** — técnicamente:

1. `src/lib/charts.ts` (puro, testeable): funciones `serieVentasProducto(history, moves, productId)`, `serieKpiEquipo(snapshots, teamId, metric)`, `comparativaEquipos(snapshots, metric, round)` que devuelven `Array<{x, [serieName]: number}>` — el formato nativo de Recharts.
2. Componente `<ChartBuilder>` con tres selectores simples (radio/chips, no dropdowns anidados — audiencia 17 años):
   - **Qué mirar**: Ventas por producto · Ganancia · Caja · Nivel de servicio · Merma.
   - **Quiénes**: Mi equipo · Mi equipo vs top 3 · Todos (solo en proyector).
   - El tipo de gráfico se decide **automáticamente** (serie temporal → línea con la historia en gris y las rondas en color; comparación entre equipos → barras): no se le pide al chico que elija "line vs bar".
3. La vista del facilitador/proyector reutiliza el mismo componente con `scope='todos'`.
4. Eje X unificado: `semana ∈ {-8..-1, 1..5}` con banda sombreada separando "historia" de "tu gestión".

---

## 7. ROADMAP (días-persona, dev senior con IA; el repo compila hoy)

| Fase | Contenido | d-p | MVP evento |
|---|---|---|---|
| F0 — Fundaciones | `schema.sql` v2 aplicado; `types.ts`; `constants.ts` con seed completo (catálogo, ofertas, historia, plan demanda, eventos); `engine.ts` + vitest (≥10 tests) | 3.0 | ✅ |
| F1 — Servidor | `store/` v2 (create, join+reconexión, orders con validaciones, open/close/reveal idempotente, facilitator state, kick); rate-limit PIN; routes | 2.5 | ✅ |
| F2 — UI equipo | Brief/onboarding, pestañas: Tienda (inventario por lote), Proveedores (comparador de ofertas), Pedido (carrito con caja disponible), Resultados por ronda | 3.0 | ✅ |
| F3 — UI facilitador | Panel v2: estado por equipo (quién pidió), editar demanda/eventos, open/close/reveal, ranking proyector | 2.0 | ✅ |
| F4 — Robustez red | `useSessionData` v2: reconexión, polling respaldo 12 s, refetch en `visibilitychange`/`online`, debounce | 1.5 | ✅ **no negociable** |
| F5 — Gráficos | `charts.ts` + `<ChartBuilder>` + sparklines; pestaña Analiza + vista proyector | 1.5 | ✅ (versión con 3 métricas; el resto post-corte) |
| F6 — Ensayo | Sesión de prueba completa con 20 pestañas simuladas, datos definitivos del evento, ajuste de balance económico, guía del facilitador | 1.5 | ✅ |
| **Corte MVP** | | **15.0** | |
| F7 — Nice-to-have | Constructor libre de gráficos (métrica × equipos arbitrarios), animación de reveal en proyector, export CSV, badges/logros por ronda, PWA offline-first | 3–4 | ❌ |

Recortes de emergencia si el tiempo aprieta (en orden): (1) fijar el catálogo sin edición del facilitador (solo demanda editable); (2) `close` y `reveal` como un solo botón; (3) gráficos solo "Ventas por producto" y "Ganancia acumulada".

---

## 8. RIESGOS TÉCNICOS Y MITIGACIONES

| Riesgo | Severidad | Mitigación concreta |
|---|---|---|
| **Realtime sin reconexión ni respaldo** (defecto v1; celulares bloquean pantalla → el websocket muere → el equipo "se congela") | CRÍTICA | En `useSessionData` v2: (a) callback de estado en `.subscribe((status)=>…)` → en `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED`, `removeChannel` + resuscribir con backoff 1s/2s/4s; (b) **polling de respaldo cada 12 s** que refetchea `sessions` y `rounds` (baratas) siempre, y todo si el canal no está `SUBSCRIBED`; (c) refetch total en `document.visibilitychange→visible` y `window.online` — este es EL caso real del aula: chico desbloquea el celular; (d) indicador visual "reconectando…" para que el facilitador detecte equipos caídos. |
| **Tormenta de recargas al revelar** (v1: 20 inserts en `results` × 25 clientes × 4 refetches c/u) | ALTA | Tres capas: (1) los snapshots se insertan en **un solo batch** (1 statement); (2) el cliente NO refetchea por evento de `kpi_snapshots` fila a fila — el disparador de recarga es el **update único de `rounds.status→'revealed'`** (1 evento → 1 refetch por cliente); `inventory_lots/moves` ni siquiera están en la publicación Realtime; (3) debounce trailing de 400 ms por tabla en el hook como red de seguridad. Resultado: reveal ≈ 25 refetches totales, no 2.000. |
| **PIN 4 dígitos sin rate limit** (RLS pública expone `sessions.code`; fuerza bruta de 10⁴ PINs vía `/api/facilitator/state`) | ALTA | PIN pasa a **6 dígitos**; columnas `failed_pin_attempts`/`locked_until` en `session_secrets`: 5 fallos → bloqueo 60 s (el estado vive en la DB, no en memoria — Vercel serverless no comparte memoria entre invocaciones); comparación con `timingSafeEqual`; el contador se resetea al acierto. Costo: ~15 líneas en `verifyFacilitator`. |
| **Participantes duplicados al reingresar** (v1 insertaba siempre) | ALTA | v2: unique `(session_id, lower(name))` + `join` idempotente por token (reconecta) + 409 explicativo si el nombre existe + `facilitator/kick` para limpiar en vivo. |
| **Demanda vacía → 0 silencioso** (v1: si `round_secrets` faltara, revelaría con demanda ausente) | MEDIA | v2 lo hace imposible en tres niveles: `demand_plan.planned_demand NOT NULL` poblado al crear para todas las rondas × productos; `open` y `reveal` validan cobertura completa y devuelven 409; el motor lanza excepción si le falta un producto (nunca asume 0). |
| **"No jugar gana"** (bug de diseño v1) | MEDIA | Resuelto por la economía del dominio: costo fijo 60 Bs + almacenaje se cobran a todos, el inventario inicial se agota; y el score pondera servicio (0 ventas ⇒ service level 0). No requiere caso especial en código. |
| **Reveal doble / concurrente** (doble clic del facilitador, retry de red) | MEDIA | Lock optimista: `update rounds set status='revealed' where id=? and status='closed'` devolviendo fila; si 0 filas → 409 "ya revelada". Escrituras posteriores upsert/idempotentes. |
| **Free tier de Supabase con 25 clientes** | BAJA | Límites free: 200 conexiones Realtime concurrentes, 500 mensajes/s — usamos ~25 conexiones y picos de ~100 mensajes en un reveal: holgado. Sin conexiones directas a Postgres (todo PostgREST). Riesgo real: **pausa del proyecto por inactividad (7 días)** → checklist pre-evento: despertar el proyecto y correr un ensayo el día anterior. |
| **Vercel serverless + validación de caja concurrente** (dos POST /api/orders del mismo equipo a la vez podrían sobre-gastar) | BAJA | Un dispositivo por equipo lo hace improbable; igual, la semántica replace-all por ronda + re-validación de caja server-side en cada POST acota el daño a la última escritura; el motor re-verifica al cerrar y cancela (status `'cancelled'`) pedidos que excedan caja, en orden de creación. |
| **Next 16 / React 19 vs librería de gráficos** | BAJA | Recharts 3.x declara soporte React 19; verificar en F5 con `npm ls`; plan B ya diseñado: sparklines SVG propias + barras CSS (grid) cubren el MVP. |
| **Complejidad percibida por chicos de 17** (riesgo de producto con raíz técnica) | MEDIA | La arquitectura ayuda: toda la complejidad (FEFO, merma, holding) vive en el motor server-side; el cliente solo muestra resultados narrados ("Se te vencieron 8 leches: −44 Bs"). El equipo decide UNA cosa por ronda: qué pedir, a quién, cuánto. |

Archivos de referencia del análisis: `c:/Users/Usuario/Documents/Stock Perfecto - UPSA/Stock_perfecto/supabase/schema.sql`, `src/lib/server/store.ts`, `src/lib/game.ts`, `src/lib/useSessionData.ts`, `src/lib/types.ts`, `src/lib/constants.ts`, `src/lib/ids.ts`, `src/lib/supabase/admin.ts`.