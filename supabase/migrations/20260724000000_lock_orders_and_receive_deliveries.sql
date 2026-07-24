-- Cambios de flujo de compras: un envío por equipo/ronda y entregas del camión
-- visibles al inicio de la semana en que llegan.

update public.products
set active_from_round = 0
where sku in ('HUEVOS', 'DETERG');

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
  values (p_session_id, p_team_id, p_round_id, now());

  update public.rounds
  set submission_count = (
    select count(*) from public.order_submissions where round_id = p_round_id
  )
  where id = p_round_id;
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
