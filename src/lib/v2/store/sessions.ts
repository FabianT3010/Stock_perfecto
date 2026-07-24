// Store v2: creación de sesión (con siembra completa), unión de equipos y estado.
import "server-only";
import { clampInt, db, loadSessionByCode, num, verifyTeam } from "./context";
import { ApiError } from "./http";
import {
  generatePin,
  generateRoomCode,
  generateTeamCode,
  generateToken,
  randomSeed,
} from "@/lib/v2/ids";
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

// ---------------------------------------------------------------- crear sesión
export async function createSession(body: CreateSessionBody) {
  const name = (body.name || "La Tiendita de Doña Peta").trim().slice(0, 80);
  let pin = (body.pin || "").trim();
  if (pin && !/^\d{6}$/.test(pin)) throw new ApiError(400, "El PIN debe tener 6 dígitos.");
  if (!pin) pin = generatePin();
  const totalRounds = clampInt(body.totalRounds ?? DEFAULT_TOTAL_ROUNDS, 1, ROUND_SCRIPTS.length);
  const maxTeams = clampInt(body.maxTeams ?? 20, 1, 40);
  const roundDurationSeconds = clampInt(
    Math.round(num(body.roundDurationMinutes, 6) * 60),
    30,
    7200,
  );
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
      max_teams: maxTeams,
      registration_open: true,
      default_round_seconds: roundDurationSeconds,
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
        duration_seconds: roundDurationSeconds,
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

  return { session: session as SessionRow, code, pin, teams: [] };
}

// -------------------------------------------------------------- unirse a sala
export async function joinTeam(
  code: string,
  teamName: string | undefined,
  teamCode: string | undefined,
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

  // 2) recuperación en otro dispositivo mediante el código privado del equipo.
  const normalizedTeamCode = (teamCode || "").trim().toUpperCase();
  if (normalizedTeamCode) {
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalizedTeamCode)) {
      throw new ApiError(400, "El código de recuperación tiene 6 caracteres.");
    }
    const { data: sec, error: secErr } = await db()
      .from("team_secrets")
      .select("team_id, token")
      .eq("join_code", normalizedTeamCode)
      .maybeSingle();
    if (secErr) throw new ApiError(500, secErr.message);
    if (!sec) throw new ApiError(401, "Código de recuperación incorrecto.");

    const { data: existing } = await db()
      .from("teams")
      .select("id, name, session_id")
      .eq("id", sec.team_id)
      .eq("session_id", session.id)
      .maybeSingle();
    if (!existing) throw new ApiError(401, "Ese código no pertenece a esta sala.");
    return {
      teamId: existing.id as string,
      token: sec.token as string,
      name: existing.name as string,
      session,
      created: false,
    };
  }

  // 3) alta inicial: una mesa crea su equipo mientras el lobby está abierto.
  const normalizedName = (teamName || "").trim().replace(/\s+/g, " ").slice(0, 30);
  if (normalizedName.length < 2) {
    throw new ApiError(400, "El nombre del equipo debe tener entre 2 y 30 caracteres.");
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .&'_-]*$/u.test(normalizedName)) {
    throw new ApiError(400, "El nombre contiene caracteres no permitidos.");
  }
  const cleanMembers = members
    .map((member) => member.trim().replace(/\s+/g, " ").slice(0, 40))
    .filter(Boolean)
    .slice(0, 8);
  const { data: productRows, error: productError } = await db()
    .from("products")
    .select("id, sku")
    .eq("session_id", session.id);
  if (productError) throw new ApiError(500, productError.message);
  const productIdBySku = new Map((productRows ?? []).map((product) => [product.sku as string, product.id as string]));
  const initialLots = PRODUCTS.flatMap((product) => {
    const productId = productIdBySku.get(product.sku);
    if (!productId || product.startingStock <= 0) return [];
    return [{
      product_id: productId,
      qty: product.startingStock,
      unit_cost: initialLotCost(product.sku),
      expires_after_round: product.initialExpiresAfterRound,
    }];
  });

  const newToken = generateToken();
  let joinCode = generateTeamCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db().rpc("register_game_team", {
      p_session_id: session.id,
      p_name: normalizedName,
      p_member_names: cleanMembers,
      p_token: newToken,
      p_join_code: joinCode,
      p_initial_lots: initialLots,
    });
    if (!error && data?.[0]) {
      return {
        teamId: data[0].team_id as string,
        token: newToken,
        joinCode,
        name: data[0].team_name as string,
        session,
        created: true,
      };
    }
    if (error?.message.includes("teams_session_name_uq")) {
      throw new ApiError(409, "Ese nombre de equipo ya está registrado.");
    }
    if (error?.message.includes("máximo de equipos")) {
      throw new ApiError(409, "La sala alcanzó el máximo de equipos.");
    }
    if (error?.message.includes("inscripciones están cerradas")) {
      throw new ApiError(409, "Las inscripciones están cerradas.");
    }
    if (!error?.message.includes("team_secrets")) {
      throw new ApiError(500, error?.message ?? "No se pudo crear el equipo.");
    }
    joinCode = generateTeamCode();
  }
  throw new ApiError(500, "No se pudo generar la credencial del equipo.");
}

// --------------------------------------------------- estado privado del equipo
export async function getTeamState(code: string, teamId: string, token: string) {
  const session = await loadSessionByCode(code);
  const team = await verifyTeam(teamId, token);
  if (team.session_id !== session.id) {
    throw new ApiError(403, "El equipo no pertenece a esta sala.");
  }

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
  const { data: submission, error: submissionError } = await db()
    .from("order_submissions")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("round_id", openRound?.id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();
  if (submissionError) throw new ApiError(500, submissionError.message);
  const committed = myOrders.reduce((s, o) => s + Number(o.total_cost), 0);
  const { data: pendingOrders, error: pendingError } = await db()
    .from("purchase_orders")
    .select("id, supplier_id, product_id, qty, placed_round, arrives_round, total_cost")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("arrives_round");
  if (pendingError) throw new ApiError(500, pendingError.message);
  const { data: productResults, error: resultError } = await db()
    .from("product_round_results")
    .select("*")
    .eq("team_id", teamId)
    .order("round_number");
  if (resultError) throw new ApiError(500, resultError.message);

  return {
    session,
    team,
    openRound: openRound ?? null,
    hasSubmitted: Boolean(submission),
    myOrders,
    pendingOrders: pendingOrders ?? [],
    productResults: productResults ?? [],
    availableCash: Number(team.cash) - committed,
  };
}
