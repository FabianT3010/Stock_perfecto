-- ============================================================================
-- Stock Perfecto v2 — "La Tiendita de Doña Peta" (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Modelo de visibilidad (mismo patrón que v1):
--   PÚBLICAS (anon SELECT + Realtime en las que cambian en juego):
--     sessions, rounds, teams, products, suppliers, supplier_offers,
--     history_weeks, inventory_lots, inventory_moves, kpi_snapshots,
--     product_round_results
--   SECRETAS (sin políticas anon + revoke; solo service_role):
--     session_secrets, team_secrets, round_plans, demand_plan, purchase_orders,
--     order_submissions
--   Regla anti-trampa: nada que revele el futuro (demanda, eventos no abiertos,
--   pedidos ajenos de la ronda en curso) vive en tabla pública. Los pedidos se
--   publican como movimientos de inventario al revelar (secreto ex-ante).
--
-- Fuente de verdad de números y reglas: PLAN-V2.md §2/§4. Ejecutar completo en
-- el SQL Editor de Supabase para una instalación nueva de v2.
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
  max_teams             integer not null default 20 check (max_teams between 1 and 40),
  registration_open     boolean not null default true,
  default_round_seconds integer not null default 360 check (default_round_seconds between 30 and 7200),
  starting_cash         numeric not null default 800,
  fixed_cost_per_round  numeric not null default 60,
  holding_cost_per_unit numeric not null default 0.20,
  service_bonus_per_pt  numeric not null default 5,     -- Bs por punto de % de servicio prom.
  salvage_rate          numeric not null default 0.50,  -- estante vigente al 50% del costo
  history_seed          integer not null default 0,
  created_at            timestamptz not null default now()
);
alter table public.sessions add column if not exists max_teams integer not null default 20;
alter table public.sessions add column if not exists registration_open boolean not null default true;
alter table public.sessions add column if not exists default_round_seconds integer not null default 360;

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
  token   text not null unique,
  join_code text not null unique                           -- código impreso en una sola mesa
);

-- Compatibilidad al aplicar v2 sobre una base creada con una revisión anterior.
alter table public.team_secrets add column if not exists join_code text;
update public.team_secrets
set join_code = upper(substr(translate(replace(gen_random_uuid()::text, '-', ''), '01', '23'), 1, 6))
where join_code is null;
alter table public.team_secrets alter column join_code set not null;
create unique index if not exists team_secrets_join_code_uq on public.team_secrets(join_code);

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
  duration_seconds  integer not null default 360 check (duration_seconds between 30 and 7200),
  opened_at         timestamptz,
  closes_at         timestamptz,                   -- reloj autoritativo de la ronda
  submission_count  integer not null default 0,
  closed_at         timestamptz,
  revealed_at       timestamptz,
  unique (session_id, round_number)
);
create index if not exists rounds_session_idx on public.rounds(session_id);
alter table public.rounds add column if not exists closes_at timestamptz;
alter table public.rounds add column if not exists duration_seconds integer not null default 360;
alter table public.rounds add column if not exists submission_count integer not null default 0;

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
  is_auto          boolean not null default false,
  status           text not null default 'pending'
                     check (status in ('pending','delivered','cancelled')),
  created_at       timestamptz not null default now(),
  unique (team_id, round_id, offer_id)
);
create index if not exists po_round_idx   on public.purchase_orders(round_id);
create index if not exists po_team_idx    on public.purchase_orders(team_id);
create index if not exists po_arrival_idx on public.purchase_orders(session_id, arrives_round, status);
alter table public.purchase_orders add column if not exists is_auto boolean not null default false;

-- Una cabecera separada permite distinguir "envié compra 0" de "no envié".
create table if not exists public.order_submissions (       -- SECRETA
  session_id  uuid not null references public.sessions(id) on delete cascade,
  team_id     uuid not null references public.teams(id) on delete cascade,
  round_id    uuid not null references public.rounds(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (team_id, round_id)
);
create index if not exists submissions_round_idx on public.order_submissions(round_id);

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
create unique index if not exists lots_order_uq
  on public.inventory_lots(order_id) where order_id is not null;

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

-- ----------------------------------------------- product_round_results (PUB)
create table if not exists public.product_round_results (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions(id) on delete cascade,
  team_id        uuid not null references public.teams(id) on delete cascade,
  round_id       uuid not null references public.rounds(id) on delete cascade,
  round_number   integer not null,
  product_id     uuid not null references public.products(id) on delete cascade,
  demand_units   integer not null,
  sold_units     integer not null,
  lost_units     integer not null,
  sales_revenue  numeric not null,
  lost_revenue   numeric not null,
  created_at     timestamptz not null default now(),
  unique (team_id, round_id, product_id)
);
create index if not exists product_results_session_idx
  on public.product_round_results(session_id, round_number);
create index if not exists product_results_team_idx
  on public.product_round_results(team_id, round_number);

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
alter table public.order_submissions enable row level security;
alter table public.inventory_lots   enable row level security;
alter table public.inventory_moves  enable row level security;
alter table public.kpi_snapshots    enable row level security;
alter table public.product_round_results enable row level security;
alter table public.history_weeks    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['sessions','products','suppliers','supplier_offers',
    'teams','rounds','inventory_lots','inventory_moves','kpi_snapshots',
    'product_round_results','history_weeks']
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
revoke all on public.order_submissions from anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ============================================================================
-- Operaciones atómicas del flujo crítico
-- ============================================================================

create or replace function public.replace_team_orders(
  p_session_id uuid,
  p_team_id uuid,
  p_round_id uuid,
  p_orders jsonb
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_team_session uuid;
  v_round_session uuid;
  v_round_status text;
begin
  select session_id into v_team_session
  from public.teams
  where id = p_team_id
  for update;

  select session_id, status into v_round_session, v_round_status
  from public.rounds
  where id = p_round_id
  for share;

  if v_team_session is distinct from p_session_id
     or v_round_session is distinct from p_session_id then
    raise exception 'Equipo o ronda fuera de la sesión';
  end if;
  if v_round_status is distinct from 'open' then
    raise exception 'La ronda ya no acepta pedidos';
  end if;
  if exists (
    select 1
    from public.order_submissions
    where team_id = p_team_id and round_id = p_round_id
  ) then
    raise exception 'El pedido ya fue guardado y no puede modificarse';
  end if;

  insert into public.purchase_orders (
    session_id, team_id, round_id, placed_round, offer_id, supplier_id,
    product_id, qty, unit_cost, total_cost, lead_time_rounds, arrives_round, status
  )
  select
    p_session_id, p_team_id, p_round_id, x.placed_round, x.offer_id,
    x.supplier_id, x.product_id, x.qty, x.unit_cost, x.total_cost,
    x.lead_time_rounds, x.arrives_round, 'pending'
  from jsonb_to_recordset(coalesce(p_orders, '[]'::jsonb)) as x(
    placed_round integer,
    offer_id uuid,
    supplier_id uuid,
    product_id uuid,
    qty integer,
    unit_cost numeric,
    total_cost numeric,
    lead_time_rounds integer,
    arrives_round integer
  );

  insert into public.order_submissions(session_id, team_id, round_id, submitted_at)
  values (p_session_id, p_team_id, p_round_id, now())
  ;

  update public.rounds
  set submission_count = (
    select count(*) from public.order_submissions where round_id = p_round_id
  )
  where id = p_round_id;
end;
$$;

create or replace function public.register_game_team(
  p_session_id uuid,
  p_name text,
  p_member_names text[],
  p_token text,
  p_join_code text,
  p_initial_lots jsonb
) returns table(team_id uuid, team_name text)
language plpgsql
set search_path = ''
as $$
declare
  v_session public.sessions%rowtype;
  v_team_id uuid;
begin
  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;

  if v_session.id is null then raise exception 'Sala no encontrada'; end if;
  if v_session.status <> 'lobby' or not v_session.registration_open then
    raise exception 'Las inscripciones están cerradas';
  end if;
  if (select count(*) from public.teams where session_id = p_session_id) >= v_session.max_teams then
    raise exception 'La sala alcanzó el máximo de equipos';
  end if;

  insert into public.teams(session_id, name, member_names, cash)
  values (
    p_session_id,
    p_name,
    coalesce(p_member_names, array[]::text[]),
    v_session.starting_cash
  )
  returning id into v_team_id;

  insert into public.team_secrets(team_id, token, join_code)
  values (v_team_id, p_token, p_join_code);

  with new_lots as (
    insert into public.inventory_lots (
      session_id, team_id, product_id, acquired_round, qty_initial,
      qty_remaining, unit_cost, source, expires_after_round
    )
    select
      p_session_id, v_team_id, x.product_id, 0, x.qty, x.qty,
      x.unit_cost, 'initial', x.expires_after_round
    from jsonb_to_recordset(coalesce(p_initial_lots, '[]'::jsonb)) as x(
      product_id uuid,
      qty integer,
      unit_cost numeric,
      expires_after_round integer
    )
    where x.qty > 0
      and exists (
        select 1 from public.products p
        where p.id = x.product_id and p.session_id = p_session_id
      )
    returning id, product_id, qty_initial
  )
  insert into public.inventory_moves (
    session_id, team_id, product_id, lot_id, round_number, type, qty
  )
  select p_session_id, v_team_id, product_id, id, 0, 'initial', qty_initial
  from new_lots;

  return query
  select v_team_id, p_name;
end;
$$;

create or replace function public.open_game_round(
  p_session_id uuid,
  p_round_number integer,
  p_duration_seconds integer default null
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_round public.rounds%rowtype;
  v_plan public.round_plans%rowtype;
  v_delivery_factor numeric;
  v_order record;
  v_delivered_qty integer;
  v_undelivered_qty integer;
  v_expires_after_round integer;
  v_lot_id uuid;
begin
  perform 1 from public.sessions where id = p_session_id for update;
  select * into v_round
  from public.rounds
  where session_id = p_session_id and round_number = p_round_number
  for update;

  if v_round.id is null then raise exception 'Ronda no encontrada'; end if;
  if v_round.status <> 'pending' then raise exception 'La ronda no está pendiente'; end if;
  if not exists (select 1 from public.teams where session_id = p_session_id) then
    raise exception 'Registra al menos un equipo antes de abrir la primera ronda';
  end if;
  if exists (
    select 1 from public.rounds
    where session_id = p_session_id and status in ('open', 'closed')
  ) then
    raise exception 'Hay otra ronda sin revelar';
  end if;
  if p_round_number > 1 and not exists (
    select 1 from public.rounds
    where session_id = p_session_id
      and round_number = p_round_number - 1
      and status = 'revealed'
  ) then
    raise exception 'Primero revela la ronda anterior';
  end if;

  select * into v_plan from public.round_plans where round_id = v_round.id;
  if v_plan.round_id is null then raise exception 'Ronda sin plan'; end if;

  -- Los pedidos del camión llegan antes de que el equipo tome decisiones de
  -- esta semana; por eso se publican en inventario al abrir la ronda.
  v_delivery_factor := greatest(
    0,
    least(1, coalesce((v_plan.supply_config ->> 'deliveryFactor')::numeric, 1))
  );
  for v_order in
    select po.*, p.shelf_life_rounds
    from public.purchase_orders po
    join public.products p on p.id = po.product_id
    where po.session_id = p_session_id
      and po.arrives_round = p_round_number
      and po.status = 'pending'
      and po.lead_time_rounds > 0
    for update of po
  loop
    v_delivered_qty := floor(v_order.qty * v_delivery_factor)::integer;
    v_undelivered_qty := v_order.qty - v_delivered_qty;
    v_expires_after_round := case
      when v_order.shelf_life_rounds is null then null
      else p_round_number + v_order.shelf_life_rounds - 1
    end;

    if v_delivered_qty > 0 then
      insert into public.inventory_lots (
        session_id, team_id, product_id, acquired_round, qty_initial,
        qty_remaining, unit_cost, source, order_id, expires_after_round
      ) values (
        p_session_id, v_order.team_id, v_order.product_id, p_round_number,
        v_delivered_qty, v_delivered_qty, v_order.unit_cost, 'order', v_order.id,
        v_expires_after_round
      ) returning id into v_lot_id;

      insert into public.inventory_moves (
        session_id, team_id, product_id, lot_id, round_number, type, qty
      ) values (
        p_session_id, v_order.team_id, v_order.product_id, v_lot_id,
        p_round_number, 'arrival', v_delivered_qty
      );
    end if;

    if v_undelivered_qty > 0 then
      update public.teams
      set cash = cash + v_undelivered_qty * v_order.unit_cost
      where id = v_order.team_id and session_id = p_session_id;

      insert into public.inventory_moves (
        session_id, team_id, product_id, lot_id, round_number, type, qty
      ) values (
        p_session_id, v_order.team_id, v_order.product_id, null,
        p_round_number, 'refund', v_undelivered_qty
      );
    end if;

    update public.purchase_orders
    set status = 'delivered'
    where id = v_order.id;
  end loop;

  update public.rounds
  set status = 'open',
      opened_at = now(),
      closes_at = now() + make_interval(
        secs => greatest(30, least(coalesce(p_duration_seconds, v_round.duration_seconds), 7200))
      ),
      submission_count = 0,
      closed_at = null,
      event_headline = v_plan.event_headline,
      event_description = v_plan.event_description,
      event_icon = v_plan.event_icon,
      supply_config = v_plan.supply_config
  where id = v_round.id;

  update public.sessions
  set status = 'running',
      current_round = p_round_number,
      registration_open = false
  where id = p_session_id;
end;
$$;

create or replace function public.close_game_round(
  p_session_id uuid,
  p_round_number integer
) returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.rounds
  set status = 'closed', closed_at = now(), closes_at = null
  where session_id = p_session_id
    and round_number = p_round_number
    and status = 'open';
  if not found then raise exception 'Solo se puede cerrar la ronda abierta'; end if;
end;
$$;

drop function if exists public.extend_game_round(uuid, integer, integer);

create or replace function public.set_game_round_time(
  p_session_id uuid,
  p_round_number integer,
  p_seconds integer
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_seconds < 30 or p_seconds > 7200 then
    raise exception 'El tiempo debe estar entre 30 segundos y 120 minutos';
  end if;

  select status into v_status
  from public.rounds
  where session_id = p_session_id and round_number = p_round_number
  for update;

  if v_status = 'pending' then
    update public.rounds
    set duration_seconds = p_seconds
    where session_id = p_session_id and round_number = p_round_number;
  elsif v_status = 'open' then
    update public.rounds
    set duration_seconds = p_seconds,
        closes_at = now() + make_interval(secs => p_seconds)
    where session_id = p_session_id and round_number = p_round_number;
  else
    raise exception 'Solo puedes editar el tiempo antes o durante una ronda abierta';
  end if;
end;
$$;

drop function if exists public.apply_round_result(
  uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, boolean
);
drop function if exists public.apply_round_result(
  uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean
);

create or replace function public.apply_round_result(
  p_session_id uuid,
  p_round_id uuid,
  p_round_number integer,
  p_auto_orders jsonb,
  p_new_lots jsonb,
  p_lot_patches jsonb,
  p_moves jsonb,
  p_delivered_order_ids jsonb,
  p_product_results jsonb,
  p_kpis jsonb,
  p_finish boolean
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.rounds
  where id = p_round_id
    and session_id = p_session_id
    and round_number = p_round_number
  for update;
  if v_status is distinct from 'closed' then
    raise exception 'La ronda no está cerrada o ya fue revelada';
  end if;

  insert into public.purchase_orders (
    id, session_id, team_id, round_id, placed_round, offer_id, supplier_id,
    product_id, qty, unit_cost, total_cost, lead_time_rounds, arrives_round,
    is_auto, status
  )
  select
    x.id, p_session_id, x.team_id, p_round_id, p_round_number, x.offer_id,
    x.supplier_id, x.product_id, x.qty, x.unit_cost, x.total_cost,
    x.lead_time_rounds, x.arrives_round, true, 'pending'
  from jsonb_to_recordset(coalesce(p_auto_orders, '[]'::jsonb)) as x(
    id uuid,
    team_id uuid,
    offer_id uuid,
    supplier_id uuid,
    product_id uuid,
    qty integer,
    unit_cost numeric,
    total_cost numeric,
    lead_time_rounds integer,
    arrives_round integer
  );

  insert into public.inventory_lots (
    session_id, team_id, product_id, acquired_round, qty_initial,
    qty_remaining, unit_cost, source, order_id, expires_after_round
  )
  select
    p_session_id, x.team_id, x.product_id, x.acquired_round, x.qty_initial,
    x.qty_remaining, x.unit_cost, 'order', x.order_id, x.expires_after_round
  from jsonb_to_recordset(coalesce(p_new_lots, '[]'::jsonb)) as x(
    team_id uuid,
    product_id uuid,
    acquired_round integer,
    qty_initial integer,
    qty_remaining integer,
    unit_cost numeric,
    order_id uuid,
    expires_after_round integer
  );

  update public.inventory_lots l
  set qty_remaining = x.qty_remaining
  from jsonb_to_recordset(coalesce(p_lot_patches, '[]'::jsonb)) as x(
    lot_id uuid,
    qty_remaining integer
  )
  where l.id = x.lot_id and l.session_id = p_session_id;

  insert into public.inventory_moves (
    session_id, team_id, product_id, lot_id, round_number, type, qty
  )
  select
    p_session_id, x.team_id, x.product_id,
    coalesce(
      x.lot_id,
      (select l.id from public.inventory_lots l where l.order_id = x.order_id)
    ),
    p_round_number, x.type, x.qty
  from jsonb_to_recordset(coalesce(p_moves, '[]'::jsonb)) as x(
    team_id uuid,
    product_id uuid,
    lot_id uuid,
    order_id uuid,
    type text,
    qty integer
  );

  update public.purchase_orders
  set status = 'delivered'
  where session_id = p_session_id
    and id in (
      select value::uuid
      from jsonb_array_elements_text(coalesce(p_delivered_order_ids, '[]'::jsonb))
    );

  insert into public.product_round_results (
    session_id, team_id, round_id, round_number, product_id,
    demand_units, sold_units, lost_units, sales_revenue, lost_revenue
  )
  select
    p_session_id, x.team_id, p_round_id, p_round_number, x.product_id,
    x.demand_units, x.sold_units, x.lost_units, x.sales_revenue, x.lost_revenue
  from jsonb_to_recordset(coalesce(p_product_results, '[]'::jsonb)) as x(
    team_id uuid,
    product_id uuid,
    demand_units integer,
    sold_units integer,
    lost_units integer,
    sales_revenue numeric,
    lost_revenue numeric
  )
  on conflict (team_id, round_id, product_id) do update set
    demand_units = excluded.demand_units,
    sold_units = excluded.sold_units,
    lost_units = excluded.lost_units,
    sales_revenue = excluded.sales_revenue,
    lost_revenue = excluded.lost_revenue;

  insert into public.kpi_snapshots (
    session_id, team_id, round_id, round_number, revenue, purchases_cash_out,
    purchases_refund, cogs, holding_cost, fixed_cost, spoilage_units,
    spoilage_cost, demand_total, units_sold, lost_sales, service_level,
    avg_service_level, sell_through, stock_end_units, stock_end_value,
    cash_start, cash_end, debt, profit_round, profit_cumulative,
    score_round, score_total
  )
  select
    p_session_id, x.team_id, p_round_id, p_round_number, x.revenue,
    x.purchases_cash_out, x.purchases_refund, x.cogs, x.holding_cost,
    x.fixed_cost, x.spoilage_units, x.spoilage_cost, x.demand_total,
    x.units_sold, x.lost_sales, x.service_level, x.avg_service_level,
    x.sell_through, x.stock_end_units, x.stock_end_value, x.cash_start,
    x.cash_end, x.debt, x.profit_round, x.profit_cumulative,
    x.score_round, x.score_total
  from jsonb_to_recordset(coalesce(p_kpis, '[]'::jsonb)) as x(
    team_id uuid,
    revenue numeric,
    purchases_cash_out numeric,
    purchases_refund numeric,
    cogs numeric,
    holding_cost numeric,
    fixed_cost numeric,
    spoilage_units integer,
    spoilage_cost numeric,
    demand_total integer,
    units_sold integer,
    lost_sales integer,
    service_level numeric,
    avg_service_level numeric,
    sell_through numeric,
    stock_end_units integer,
    stock_end_value numeric,
    cash_start numeric,
    cash_end numeric,
    debt numeric,
    profit_round numeric,
    profit_cumulative numeric,
    score_round numeric,
    score_total numeric,
    service_sum numeric,
    rounds_played integer
  )
  on conflict (team_id, round_id) do update set
    revenue = excluded.revenue,
    purchases_cash_out = excluded.purchases_cash_out,
    purchases_refund = excluded.purchases_refund,
    cogs = excluded.cogs,
    holding_cost = excluded.holding_cost,
    fixed_cost = excluded.fixed_cost,
    spoilage_units = excluded.spoilage_units,
    spoilage_cost = excluded.spoilage_cost,
    demand_total = excluded.demand_total,
    units_sold = excluded.units_sold,
    lost_sales = excluded.lost_sales,
    service_level = excluded.service_level,
    avg_service_level = excluded.avg_service_level,
    sell_through = excluded.sell_through,
    stock_end_units = excluded.stock_end_units,
    stock_end_value = excluded.stock_end_value,
    cash_start = excluded.cash_start,
    cash_end = excluded.cash_end,
    debt = excluded.debt,
    profit_round = excluded.profit_round,
    profit_cumulative = excluded.profit_cumulative,
    score_round = excluded.score_round,
    score_total = excluded.score_total;

  update public.teams t
  set cash = x.cash_end,
      debt = x.debt,
      score_total = x.score_total,
      service_sum = x.service_sum,
      rounds_played = x.rounds_played
  from jsonb_to_recordset(coalesce(p_kpis, '[]'::jsonb)) as x(
    team_id uuid,
    cash_end numeric,
    debt numeric,
    score_total numeric,
    service_sum numeric,
    rounds_played integer
  )
  where t.id = x.team_id and t.session_id = p_session_id;

  if p_finish then
    update public.sessions set status = 'finished' where id = p_session_id;
  end if;

  -- Última escritura: los clientes solo observan "revealed" con datos completos.
  update public.rounds
  set status = 'revealed', revealed_at = now(), closes_at = null
  where id = p_round_id;
end;
$$;

revoke all on function public.replace_team_orders(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.register_game_team(uuid, text, text[], text, text, jsonb) from public, anon, authenticated;
revoke all on function public.open_game_round(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.close_game_round(uuid, integer) from public, anon, authenticated;
revoke all on function public.set_game_round_time(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.apply_round_result(uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.replace_team_orders(uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.register_game_team(uuid, text, text[], text, text, jsonb) to service_role;
grant execute on function public.open_game_round(uuid, integer, integer) to service_role;
grant execute on function public.close_game_round(uuid, integer) to service_role;
grant execute on function public.set_game_round_time(uuid, integer, integer) to service_role;
grant execute on function public.apply_round_result(uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean) to service_role;

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
