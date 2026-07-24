// Store v2: creación de sesión (con siembra completa), unión de equipos y estado.
import "server-only";
import { clampInt, db, loadSessionByCode, num, verifyTeam } from "./context";
import { ApiError } from "./http";
import { generatePin, generateRoomCode, generateToken, randomSeed } from "@/lib/v2/ids";
import {
  DEFAULT_TOTAL_ROUNDS,
  ECONOMICS,
  OFFERS,
  PRODUCTS,
  ROUND_SCRIPTS,
  SUPPLIERS,
  initialLotCost,
} from "@/lib/v2/constants";
import { generateDemandPlan, generateHistory } from "@/lib/v2/seed";
import type { CreateSessionBody, SessionRow } from "@/lib/v2/types";

/** Inserta el inventario heredado (lotes iniciales + movimientos) de un equipo. */
async function seedTeamInventory(sessionId: string, teamId: string) {
  const { data: products } = await db()
    .from("products")
    .select("id, sku")
    .eq("session_id", sessionId);
  const idBySku = new Map((products ?? []).map((p) => [p.sku as string, p.id as string]));

  const lotsPayload = PRODUCTS.filter((p) => p.startingStock > 0)
    .map((p) => {
      const productId = idBySku.get(p.sku);
      if (!productId) return null;
      return {
        session_id: sessionId,
        team_id: teamId,
        product_id: productId,
        acquired_round: 0,
        qty_initial: p.startingStock,
        qty_remaining: p.startingStock,
        unit_cost: initialLotCost(p.sku),
        source: "initial",
        expires_after_round: p.initialExpiresAfterRound,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  if (!lotsPayload.length) return;
  const { data: lots, error } = await db()
    .from("inventory_lots")
    .insert(lotsPayload)
    .select("id, product_id, qty_initial");
  if (error) throw new ApiError(500, error.message);

  const movesPayload = (lots ?? []).map((l) => ({
    session_id: sessionId,
    team_id: teamId,
    product_id: l.product_id,
    lot_id: l.id,
    round_number: 0,
    type: "initial",
    qty: l.qty_initial,
  }));
  if (movesPayload.length) await db().from("inventory_moves").insert(movesPayload);
}

async function createTeam(
  sessionId: string,
  name: string,
  members: string[],
  startingCash: number,
) {
  const { data: team, error } = await db()
    .from("teams")
    .insert({ session_id: sessionId, name, member_names: members, cash: startingCash })
    .select()
    .single();
  if (error || !team) {
    if (error?.code === "23505") throw new ApiError(409, "Ese equipo ya existe.");
    throw new ApiError(500, error?.message ?? "No se pudo crear el equipo.");
  }
  const token = generateToken();
  const { error: tErr } = await db()
    .from("team_secrets")
    .insert({ team_id: team.id, token });
  if (tErr) throw new ApiError(500, tErr.message);
  await seedTeamInventory(sessionId, team.id as string);
  return { teamId: team.id as string, token, name: team.name as string };
}

// ---------------------------------------------------------------- crear sesión
export async function createSession(body: CreateSessionBody) {
  const name = (body.name || "La Tiendita de Doña Peta").trim().slice(0, 80);
  let pin = (body.pin || "").trim();
  if (pin && !/^\d{6}$/.test(pin)) throw new ApiError(400, "El PIN debe tener 6 dígitos.");
  if (!pin) pin = generatePin();
  const totalRounds = clampInt(body.totalRounds ?? DEFAULT_TOTAL_ROUNDS, 1, ROUND_SCRIPTS.length);
  const seed = randomSeed();
  const eco = {
    startingCash: num(body.economics?.startingCash, ECONOMICS.startingCash),
    fixedCost: num(body.economics?.fixedCost, ECONOMICS.fixedCostPerRound),
    holdingCost: num(body.economics?.holdingCost, ECONOMICS.holdingCostPerUnit),
  };

  // código único
  let code = generateRoomCode();
  for (let i = 0; i < 5; i++) {
    const { data } = await db().from("sessions").select("id").eq("code", code).maybeSingle();
    if (!data) break;
    code = generateRoomCode();
  }

  const { data: session, error: sErr } = await db()
    .from("sessions")
    .insert({
      code,
      name,
      status: "lobby",
      current_round: 0,
      total_rounds: totalRounds,
      starting_cash: eco.startingCash,
      fixed_cost_per_round: eco.fixedCost,
      holding_cost_per_unit: eco.holdingCost,
      service_bonus_per_pt: ECONOMICS.serviceBonusPerPoint,
      salvage_rate: ECONOMICS.salvageRate,
      history_seed: seed,
    })
    .select()
    .single();
  if (sErr || !session) throw new ApiError(500, sErr?.message ?? "No se pudo crear la sala.");
  const sessionId = session.id as string;

  await db().from("session_secrets").insert({ session_id: sessionId, facilitator_pin: pin });

  // productos
  const { data: products, error: pErr } = await db()
    .from("products")
    .insert(
      PRODUCTS.map((p, i) => ({
        session_id: sessionId,
        sku: p.sku,
        name: p.name,
        unit_label: p.unitLabel,
        sale_price: p.salePrice,
        shelf_life_rounds: p.shelfLifeRounds,
        active_from_round: p.activeFromRound,
        sort_order: i,
      })),
    )
    .select("id, sku");
  if (pErr || !products) throw new ApiError(500, pErr?.message ?? "No se pudieron crear los productos.");
  const productIdBySku = new Map(products.map((p) => [p.sku as string, p.id as string]));

  // proveedores
  const { data: suppliers, error: supErr } = await db()
    .from("suppliers")
    .insert(
      SUPPLIERS.map((s, i) => ({
        session_id: sessionId,
        code: s.code,
        name: s.name,
        blurb: s.blurb,
        is_express: s.isExpress,
        sort_order: i,
      })),
    )
    .select("id, code");
  if (supErr || !suppliers) throw new ApiError(500, supErr?.message ?? "No se pudieron crear los proveedores.");
  const supplierIdByCode = new Map(suppliers.map((s) => [s.code as string, s.id as string]));
  const leadByCode = new Map(SUPPLIERS.map((s) => [s.code, s.leadTimeRounds]));

  // ofertas
  const offersPayload: Record<string, unknown>[] = [];
  for (const supplierCode of Object.keys(OFFERS)) {
    for (const sku of Object.keys(OFFERS[supplierCode])) {
      const offer = OFFERS[supplierCode][sku];
      offersPayload.push({
        session_id: sessionId,
        supplier_id: supplierIdByCode.get(supplierCode),
        product_id: productIdBySku.get(sku),
        unit_cost: offer.unitCost,
        pack_size: offer.packSize,
        lead_time_rounds: leadByCode.get(supplierCode as "PRINCIPAL" | "LUCHO") ?? 1,
      });
    }
  }
  await db().from("supplier_offers").insert(offersPayload);

  // rondas
  const scripts = ROUND_SCRIPTS.slice(0, totalRounds);
  const { data: rounds, error: rErr } = await db()
    .from("rounds")
    .insert(
      scripts.map((rs) => ({
        session_id: sessionId,
        round_number: rs.roundNumber,
        title: rs.title,
        status: "pending",
      })),
    )
    .select("id, round_number");
  if (rErr || !rounds) throw new ApiError(500, rErr?.message ?? "No se pudieron crear las rondas.");
  const roundIdByNumber = new Map(rounds.map((r) => [r.round_number as number, r.id as string]));

  // round_plans (evento + supply_config secretos hasta abrir)
  await db()
    .from("round_plans")
    .insert(
      scripts.map((rs) => ({
        round_id: roundIdByNumber.get(rs.roundNumber),
        event_headline: rs.event.headline,
        event_description: rs.event.description,
        event_icon: rs.event.icon,
        supply_config: rs.supply,
        facilitator_notes: rs.facilitatorNotes,
      })),
    );

  // plan de demanda (horneado con semilla)
  const demand = generateDemandPlan(seed).filter((e) => e.roundNumber <= totalRounds);
  await db()
    .from("demand_plan")
    .insert(
      demand.map((e) => ({
        session_id: sessionId,
        round_id: roundIdByNumber.get(e.roundNumber),
        product_id: productIdBySku.get(e.sku),
        planned_demand: e.planned,
      })),
    );

  // histórico de 8 semanas
  const history = generateHistory(seed);
  await db()
    .from("history_weeks")
    .insert(
      history.map((h) => ({
        session_id: sessionId,
        week_number: h.weekNumber,
        product_id: productIdBySku.get(h.sku),
        units_sold: h.unitsSold,
        lost_sales: h.lostSales,
        note: h.note,
      })),
    );

  // equipos pre-creados (opcional)
  const preTeams = (body.teams ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 40);
  const createdTeams = [];
  for (const teamName of preTeams) {
    createdTeams.push(await createTeam(sessionId, teamName, [], eco.startingCash));
  }

  return { session: session as SessionRow, code, pin, teams: createdTeams };
}

// -------------------------------------------------------------- unirse a sala
export async function joinTeam(
  code: string,
  teamName: string,
  members: string[] = [],
  token?: string,
) {
  const session = await loadSessionByCode(code);
  if (session.status === "finished") throw new ApiError(409, "La sala ya terminó.");

  // 1) reconexión por token
  if (token) {
    const { data: sec } = await db()
      .from("team_secrets")
      .select("team_id, token")
      .eq("token", token)
      .maybeSingle();
    if (sec) {
      const { data: t } = await db()
        .from("teams")
        .select("*")
        .eq("id", sec.team_id)
        .eq("session_id", session.id)
        .maybeSingle();
      if (t) return { teamId: t.id as string, token, name: t.name as string, session };
    }
  }

  const name = (teamName || "").trim().slice(0, 30);
  if (name.length < 2) throw new ApiError(400, "Escribe el nombre de tu equipo (mín. 2 caracteres).");

  // 2) ¿equipo existente por nombre? (pre-creado o ya unido) → se reclama
  const { data: teamsInSession } = await db()
    .from("teams")
    .select("id, name")
    .eq("session_id", session.id);
  const existing = (teamsInSession ?? []).find(
    (t) => (t.name as string).toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    const { data: sec } = await db()
      .from("team_secrets")
      .select("token")
      .eq("team_id", existing.id)
      .maybeSingle();
    if (!sec) throw new ApiError(500, "Equipo sin credencial.");
    if (members.length) {
      await db().from("teams").update({ member_names: members }).eq("id", existing.id);
    }
    return { teamId: existing.id as string, token: sec.token as string, name: existing.name as string, session };
  }

  // 3) crear equipo nuevo
  const created = await createTeam(session.id, name, members, Number(session.starting_cash));
  return { teamId: created.teamId, token: created.token, name: created.name, session };
}

// --------------------------------------------------- estado privado del equipo
export async function getTeamState(code: string, teamId: string, token: string) {
  const session = await loadSessionByCode(code);
  const team = await verifyTeam(teamId, token);

  // ronda abierta actual
  const { data: openRound } = await db()
    .from("rounds")
    .select("id, round_number, status")
    .eq("session_id", session.id)
    .eq("status", "open")
    .maybeSingle();

  let myOrders: { offer_id: string; product_id: string; qty: number; total_cost: number }[] = [];
  if (openRound) {
    const { data: orders } = await db()
      .from("purchase_orders")
      .select("offer_id, product_id, qty, total_cost")
      .eq("team_id", teamId)
      .eq("round_id", openRound.id);
    myOrders = (orders ?? []) as typeof myOrders;
  }
  const committed = myOrders.reduce((s, o) => s + Number(o.total_cost), 0);

  return {
    session,
    team,
    openRound: openRound ?? null,
    myOrders,
    availableCash: Number(team.cash) - committed,
  };
}
