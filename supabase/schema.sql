-- ============================================================================
-- Stock Perfecto — Esquema de base de datos (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Modelo de seguridad:
--   * Tablas PÚBLICAS  (anon puede SELECT vía RLS + se replican por Realtime):
--       sessions, rounds, participants, results
--     No exponen secretos (la demanda real de una ronda es NULL hasta revelar).
--   * Tablas SECRETAS  (RLS activo, SIN políticas para anon => denegado):
--       session_secrets, round_secrets, participant_secrets, decisions
--     Solo accesibles con la service_role (rutas del servidor), que ignora RLS.
--
-- Todas las ESCRITURAS pasan por el servidor con la service_role key.
-- Ejecutar este archivo completo en el SQL Editor de Supabase (idempotente).
-- ============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ sessions
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null default 'Stock Perfecto',
  product_label text not null default 'sándwiches',
  currency      text not null default 'Bs',
  status        text not null default 'lobby'
                  check (status in ('lobby', 'running', 'finished')),
  current_round integer not null default 0,
  total_rounds  integer not null default 5,
  created_at    timestamptz not null default now()
);

create table if not exists public.session_secrets (
  session_id       uuid primary key references public.sessions(id) on delete cascade,
  facilitator_pin  text not null
);

-- -------------------------------------------------------------------- rounds
create table if not exists public.rounds (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  round_number  integer not null,
  price         numeric not null default 10,
  cost          numeric not null default 5,
  salvage       numeric not null default 2,
  status        text not null default 'pending'
                  check (status in ('pending', 'open', 'closed', 'revealed')),
  real_demand   integer,                    -- NULL hasta que se revela
  hint_type     text not null default 'none'
                  check (hint_type in ('none', 'previous', 'history', 'indicators')),
  hint_data     jsonb,
  opened_at     timestamptz,
  closed_at     timestamptz,
  revealed_at   timestamptz,
  unique (session_id, round_number)
);
create index if not exists rounds_session_idx on public.rounds(session_id);

create table if not exists public.round_secrets (
  round_id     uuid primary key references public.rounds(id) on delete cascade,
  real_demand  integer not null            -- demanda planificada, oculta hasta revelar
);

-- -------------------------------------------------------------- participants
create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists participants_session_idx on public.participants(session_id);

create table if not exists public.participant_secrets (
  participant_id  uuid primary key references public.participants(id) on delete cascade,
  token           text not null unique
);

-- ----------------------------------------------------------------- decisions
-- Secreta: evita que un estudiante vea las cantidades de los demás en vivo.
create table if not exists public.decisions (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null references public.rounds(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  quantity        integer not null check (quantity >= 0),
  submitted_at    timestamptz not null default now(),
  unique (round_id, participant_id)
);
create index if not exists decisions_round_idx on public.decisions(round_id);

-- ------------------------------------------------------------------- results
-- Pública: se llena al revelar la ronda. Base del ranking en el cliente.
create table if not exists public.results (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.sessions(id) on delete cascade,
  round_id              uuid not null references public.rounds(id) on delete cascade,
  participant_id        uuid not null references public.participants(id) on delete cascade,
  round_number          integer not null,
  quantity              integer not null,
  real_demand           integer not null,
  units_sold            integer not null,
  leftover              integer not null,
  lost_sales            integer not null,
  revenue               numeric not null,
  salvage_recovery      numeric not null,
  cost_total            numeric not null,
  profit                numeric not null,
  service_level         numeric not null,
  inventory_efficiency  numeric not null,
  created_at            timestamptz not null default now(),
  unique (round_id, participant_id)
);
create index if not exists results_session_idx on public.results(session_id);
create index if not exists results_participant_idx on public.results(participant_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.sessions            enable row level security;
alter table public.session_secrets     enable row level security;
alter table public.rounds              enable row level security;
alter table public.round_secrets       enable row level security;
alter table public.participants        enable row level security;
alter table public.participant_secrets enable row level security;
alter table public.decisions           enable row level security;
alter table public.results             enable row level security;

-- Lectura pública (anon + authenticated) SOLO en las tablas no secretas.
drop policy if exists "public read sessions"     on public.sessions;
drop policy if exists "public read rounds"       on public.rounds;
drop policy if exists "public read participants" on public.participants;
drop policy if exists "public read results"      on public.results;

create policy "public read sessions"     on public.sessions
  for select to anon, authenticated using (true);
create policy "public read rounds"       on public.rounds
  for select to anon, authenticated using (true);
create policy "public read participants" on public.participants
  for select to anon, authenticated using (true);
create policy "public read results"      on public.results
  for select to anon, authenticated using (true);

-- Las tablas secretas quedan SIN políticas => nadie con anon/authenticated puede
-- leerlas. La service_role ignora RLS. Revocamos además privilegios directos.
revoke all on public.session_secrets     from anon, authenticated;
revoke all on public.round_secrets       from anon, authenticated;
revoke all on public.participant_secrets from anon, authenticated;
revoke all on public.decisions           from anon, authenticated;

-- Aseguramos SELECT explícito en las tablas públicas (para el rol anon).
grant select on public.sessions     to anon, authenticated;
grant select on public.rounds        to anon, authenticated;
grant select on public.participants  to anon, authenticated;
grant select on public.results       to anon, authenticated;

-- El rol de servicio (usado por el servidor) necesita privilegios DML explícitos.
-- Tiene BYPASSRLS, así que ignora las políticas, pero igual requiere el GRANT.
-- (Las default privileges de Supabase no siempre cubren tablas creadas por
-- migración, por eso lo hacemos explícito; es inocuo en la nube.)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ============================================================================
-- Realtime: publicar cambios de las tablas públicas.
-- REPLICA IDENTITY FULL para que los payloads de UPDATE/DELETE incluyan filtros.
-- ============================================================================
alter table public.sessions     replica identity full;
alter table public.rounds        replica identity full;
alter table public.participants  replica identity full;
alter table public.results       replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- Agrega cada tabla a la publicación si aún no está.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
    ) then alter publication supabase_realtime add table public.sessions; end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rounds'
    ) then alter publication supabase_realtime add table public.rounds; end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'participants'
    ) then alter publication supabase_realtime add table public.participants; end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'results'
    ) then alter publication supabase_realtime add table public.results; end if;
  end if;
end $$;
