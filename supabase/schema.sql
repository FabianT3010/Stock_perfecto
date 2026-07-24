-- ============================================================================
-- Stock Perfecto v2 — "La Tiendita de Doña Peta" (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Modelo de visibilidad (mismo patrón que v1):
--   PÚBLICAS (anon SELECT + Realtime en las que cambian en juego):
--     sessions, rounds, teams, products, suppliers, supplier_offers,
--     history_weeks, inventory_lots, inventory_moves, kpi_snapshots
--   SECRETAS (sin políticas anon + revoke; solo service_role):
--     session_secrets, team_secrets, round_plans, demand_plan, purchase_orders
--   Regla anti-trampa: nada que revele el futuro (demanda, eventos no abiertos,
--   pedidos ajenos de la ronda en curso) vive en tabla pública. Los pedidos se
--   publican como movimientos de inventario al revelar (secreto ex-ante).
--
-- Fuente de verdad de números y reglas: PLAN-V2.md §2/§4. Ejecutar completo en
-- el SQL Editor de Supabase (idempotente).
-- ============================================================================
create extension if not exists pgcrypto;

-- --------------------------------------------------------------- sessions (PUB)
create table if not exists public.sessions (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique,
  name                  text not null default 'La Tiendita de Doña Peta',
  currency              text not null default 'Bs',
  status                text not null default 'lobby'
                          check (status in ('lobby','running','finished')),
  current_round         integer not null default 0,
  total_rounds          integer not null default 5,
  starting_cash         numeric not null default 800,
  fixed_cost_per_round  numeric not null default 60,
  holding_cost_per_unit numeric not null default 0.20,
  service_bonus_per_pt  numeric not null default 5,     -- Bs por punto de % de servicio prom.
  salvage_rate          numeric not null default 0.50,  -- estante vigente al 50% del costo
  history_seed          integer not null default 0,
  created_at            timestamptz not null default now()
);

create table if not exists public.session_secrets (       -- SECRETA
  session_id          uuid primary key references public.sessions(id) on delete cascade,
  facilitator_pin     text not null,                      -- 6 dígitos
  failed_pin_attempts integer not null default 0,
  locked_until        timestamptz
);

-- --------------------------------------------------------------- products (PUB)
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.sessions(id) on delete cascade,
  sku               text not null,
  name              text not null,
  unit_label        text not null default 'u',      -- 'u', 'maple', 'bolsita'
  category          text not null default 'abarrotes',
  sale_price        numeric not null,
  shelf_life_rounds integer,                         -- NULL = no vence; 1 = solo esa semana
  active_from_round integer not null default 1,      -- desde qué ronda se vende/pide
  sort_order        integer not null default 0,
  unique (session_id, sku)
);
create index if not exists products_session_idx on public.products(session_id);

-- -------------------------------------------------------------- suppliers (PUB)
create table if not exists public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  code        text not null,                          -- 'PRINCIPAL' | 'LUCHO'
  name        text not null,
  blurb       text not null default '',
  is_express  boolean not null default false,         -- true = entrega hoy (lead 0)
  sort_order  integer not null default 0,
  unique (session_id, code)
);
create index if not exists suppliers_session_idx on public.suppliers(session_id);

create table if not exists public.supplier_offers (      -- PUB: los equipos ANALIZAN esto
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.sessions(id) on delete cascade,
  supplier_id      uuid not null references public.suppliers(id) on delete cascade,
  product_id       uuid not null references public.products(id) on delete cascade,
  unit_cost        numeric not null,
  pack_size        integer not null default 1,         -- se pide en múltiplos de esto
  lead_time_rounds integer not null default 1,         -- 0 = llega esta misma ronda
  unique (supplier_id, product_id)
);
create index if not exists offers_session_idx on public.supplier_offers(session_id);

-- ------------------------------------------------------------------ teams (PUB)
create table if not exists public.teams (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  name         text not null,
  member_names text[] not null default '{}',
  color        text not null default '#015941',
  cash         numeric not null default 0,     -- actualizado SOLO al revelar
  debt         numeric not null default 0,     -- fijos impagos acumulados
  score_total  numeric not null default 0,     -- Valor de la Tienda (al último reveal)
  service_sum  numeric not null default 0,     -- suma de niveles de servicio (para promedio)
  rounds_played integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists teams_session_idx on public.teams(session_id);
create unique index if not exists teams_session_name_uq
  on public.teams(session_id, lower(name));

create table if not exists public.team_secrets (          -- SECRETA
  team_id uuid primary key references public.teams(id) on delete cascade,
  token   text not null unique
);

-- ----------------------------------------------------------------- rounds (PUB)
create table if not exists public.rounds (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.sessions(id) on delete cascade,
  round_number      integer not null,
  title             text not null default '',
  status            text not null default 'pending'
                      check (status in ('pending','open','closed','revealed')),
  event_headline    text,                          -- se copia de round_plans al abrir
  event_description text,
  event_icon        text,
  supply_config     jsonb,                         -- {luchoCap, principalAvailable, deliveryFactor}
  opened_at         timestamptz,
  closed_at         timestamptz,
  revealed_at       timestamptz,
  unique (session_id, round_number)
);
create index if not exists rounds_session_idx on public.rounds(session_id);

create table if not exists public.round_plans (            -- SECRETA
  round_id          uuid primary key references public.rounds(id) on delete cascade,
  event_headline    text,
  event_description text,
  event_icon        text,
  supply_config     jsonb,
  facilitator_notes text
);

create table if not exists public.demand_plan (            -- SECRETA
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions(id) on delete cascade,
  round_id       uuid not null references public.rounds(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete cascade,
  planned_demand integer not null check (planned_demand >= 0),
  unique (round_id, product_id)                    -- NOT NULL + unique => nunca vacía
);
create index if not exists demand_plan_round_idx on public.demand_plan(round_id);

-- --------------------------------------------------------- purchase_orders (SEC)
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
  unit_cost        numeric not null,
  total_cost       numeric not null,
  lead_time_rounds integer not null,
  arrives_round    integer not null,
  status           text not null default 'pending'
                     check (status in ('pending','delivered','cancelled')),
  created_at       timestamptz not null default now(),
  unique (team_id, round_id, offer_id)             -- upsert: reenviar reemplaza
);
create index if not exists po_round_idx   on public.purchase_orders(round_id);
create index if not exists po_team_idx    on public.purchase_orders(team_id);
create index if not exists po_arrival_idx on public.purchase_orders(session_id, arrives_round, status);

-- ----------------------------------------------------------- inventory_lots (PUB)
create table if not exists public.inventory_lots (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.sessions(id) on delete cascade,
  team_id             uuid not null references public.teams(id) on delete cascade,
  product_id          uuid not null references public.products(id) on delete cascade,
  acquired_round      integer not null,           -- 0 = stock inicial
  qty_initial         integer not null,
  qty_remaining       integer not null,
  unit_cost           numeric not null,
  source              text not null default 'order' check (source in ('initial','order')),
  order_id            uuid references public.purchase_orders(id),
  expires_after_round integer,                    -- NULL = no vence
  created_at          timestamptz not null default now()
);
create index if not exists lots_team_idx on public.inventory_lots(team_id, product_id);
create index if not exists lots_session_idx on public.inventory_lots(session_id);

-- ---------------------------------------------------------- inventory_moves (PUB)
create table if not exists public.inventory_moves (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  team_id      uuid not null references public.teams(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  lot_id       uuid references public.inventory_lots(id),
  round_number integer not null,
  type         text not null check (type in ('initial','arrival','sale','spoilage','refund')),
  qty          integer not null,                 -- siempre positivo; type da el signo
  created_at   timestamptz not null default now()
);
create index if not exists moves_team_idx on public.inventory_moves(team_id, round_number);
create index if not exists moves_session_idx on public.inventory_moves(session_id);

-- ----------------------------------------------------------- kpi_snapshots (PUB)
create table if not exists public.kpi_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.sessions(id) on delete cascade,
  team_id            uuid not null references public.teams(id) on delete cascade,
  round_id           uuid not null references public.rounds(id) on delete cascade,
  round_number       integer not null,
  revenue            numeric not null,
  purchases_cash_out numeric not null,
  purchases_refund   numeric not null default 0,   -- R4: reembolso por lo no entregado
  cogs               numeric not null,
  holding_cost       numeric not null,
  fixed_cost         numeric not null,
  spoilage_units     integer not null,
  spoilage_cost      numeric not null,
  demand_total       integer not null,
  units_sold         integer not null,
  lost_sales         integer not null,
  service_level      numeric not null,             -- 0..1 (de esta ronda)
  avg_service_level  numeric not null,             -- 0..1 (promedio acumulado)
  sell_through       numeric not null,
  stock_end_units    integer not null,
  stock_end_value    numeric not null,             -- a costo
  cash_start         numeric not null,
  cash_end           numeric not null,
  debt               numeric not null default 0,   -- acumulada
  profit_round       numeric not null,
  profit_cumulative  numeric not null,
  score_round        numeric not null,             -- delta de Valor de la Tienda
  score_total        numeric not null,             -- Valor de la Tienda acumulado
  created_at         timestamptz not null default now(),
  unique (team_id, round_id)
);
create index if not exists kpi_session_idx on public.kpi_snapshots(session_id);
create index if not exists kpi_team_idx on public.kpi_snapshots(team_id, round_number);

-- ----------------------------------------------------------- history_weeks (PUB)
create table if not exists public.history_weeks (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  week_number integer not null,                    -- -8 .. -1
  product_id  uuid not null references public.products(id) on delete cascade,
  units_sold  integer not null,
  lost_sales  integer not null default 0,
  note        text,
  unique (session_id, week_number, product_id)
);
create index if not exists history_session_idx on public.history_weeks(session_id);

-- ============================================================================
-- Row Level Security (patrón v1)
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

-- Secretas: sin políticas + revoke (solo service_role, que bypassa RLS).
revoke all on public.session_secrets  from anon, authenticated;
revoke all on public.team_secrets     from anon, authenticated;
revoke all on public.round_plans      from anon, authenticated;
revoke all on public.demand_plan      from anon, authenticated;
revoke all on public.purchase_orders  from anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ============================================================================
-- Realtime: SOLO las públicas que cambian durante el juego.
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
