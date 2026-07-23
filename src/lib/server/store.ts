// Capa de acceso a datos del servidor. Usa la service_role (ignora RLS).
// Toda escritura de la app pasa por aquí. NUNCA importar desde el cliente.
import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { computeOutcome } from "@/lib/game";
import {
  DEFAULT_DEMANDS,
  DEFAULT_HISTORY,
  DEFAULT_PARAMS,
  DEFAULT_TOTAL_ROUNDS,
  ROUND_TEMPLATES,
  type HintType,
} from "@/lib/constants";
import { generatePin, generateRoomCode, generateToken } from "@/lib/ids";
import type {
  CreateSessionBody,
  ParticipantRow,
  RoundRow,
  SessionRow,
} from "@/lib/types";

/** Error con código HTTP para mapear en los route handlers. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function db() {
  return getAdminClient();
}

// ---------------------------------------------------------------- utilidades
async function loadSessionByCode(code: string): Promise<SessionRow> {
  if (!code || typeof code !== "string") {
    throw new ApiError(400, "Falta el código de sala.");
  }
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(404, "Sala no encontrada.");
  return data as SessionRow;
}

async function verifyFacilitator(code: string, pin: string): Promise<SessionRow> {
  const session = await loadSessionByCode(code);
  const { data, error } = await db()
    .from("session_secrets")
    .select("facilitator_pin")
    .eq("session_id", session.id)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!data || data.facilitator_pin !== pin) {
    throw new ApiError(401, "PIN de facilitador incorrecto.");
  }
  return session;
}

async function loadRound(
  sessionId: string,
  roundNumber: number,
): Promise<RoundRow> {
  const { data, error } = await db()
    .from("rounds")
    .select("*")
    .eq("session_id", sessionId)
    .eq("round_number", roundNumber)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(404, "Ronda no encontrada.");
  return data as RoundRow;
}

// ------------------------------------------------------------- crear sesión
export async function createSession(body: CreateSessionBody) {
  const name = (body.name || "Stock Perfecto").trim().slice(0, 80);
  const productLabel = (body.productLabel || "sándwiches").trim().slice(0, 40);
  const pin = (body.pin || "").trim() || generatePin();
  const totalRounds = clampInt(body.totalRounds ?? DEFAULT_TOTAL_ROUNDS, 1, 12);
  const params = {
    price: num(body.params?.price, DEFAULT_PARAMS.price),
    cost: num(body.params?.cost, DEFAULT_PARAMS.cost),
    salvage: num(body.params?.salvage, DEFAULT_PARAMS.salvage),
  };
  const demands = (body.demands && body.demands.length ? body.demands : DEFAULT_DEMANDS)
    .map((d) => clampInt(d, 0, 100000));
  const history = (body.history && body.history.length ? body.history : DEFAULT_HISTORY)
    .map((d) => clampInt(d, 0, 100000));

  // Código único (reintenta ante colisión).
  let code = generateRoomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await db().from("sessions").select("id").eq("code", code).maybeSingle();
    if (!data) break;
    code = generateRoomCode();
  }

  const { data: session, error: sErr } = await db()
    .from("sessions")
    .insert({
      code,
      name,
      product_label: productLabel,
      status: "lobby",
      current_round: 0,
      total_rounds: totalRounds,
    })
    .select()
    .single();
  if (sErr || !session) throw new ApiError(500, sErr?.message ?? "No se pudo crear la sala.");

  const { error: psErr } = await db()
    .from("session_secrets")
    .insert({ session_id: session.id, facilitator_pin: pin });
  if (psErr) throw new ApiError(500, psErr.message);

  // Crear rondas + secretos de demanda.
  const roundsPayload: Record<string, unknown>[] = [];
  const secretsPayload: { demand: number }[] = [];
  for (let n = 1; n <= totalRounds; n++) {
    const template = ROUND_TEMPLATES[n - 1];
    const hintType: HintType = template?.hintType ?? "none";
    const hintData =
      hintType === "history" || hintType === "indicators" ? { history } : null;
    roundsPayload.push({
      session_id: session.id,
      round_number: n,
      price: params.price,
      cost: params.cost,
      salvage: params.salvage,
      status: "pending",
      hint_type: hintType,
      hint_data: hintData,
    });
    secretsPayload.push({ demand: demands[(n - 1) % demands.length] });
  }

  const { data: insertedRounds, error: rErr } = await db()
    .from("rounds")
    .insert(roundsPayload)
    .select("id, round_number");
  if (rErr || !insertedRounds) throw new ApiError(500, rErr?.message ?? "No se pudieron crear las rondas.");

  const byNumber = new Map<number, string>();
  for (const r of insertedRounds) byNumber.set(r.round_number as number, r.id as string);

  const roundSecrets = roundsPayload.map((r, i) => ({
    round_id: byNumber.get(r.round_number as number)!,
    real_demand: secretsPayload[i].demand,
  }));
  const { error: rsErr } = await db().from("round_secrets").insert(roundSecrets);
  if (rsErr) throw new ApiError(500, rsErr.message);

  return { session: session as SessionRow, code, pin };
}

// -------------------------------------------------------------- unirse a sala
export async function joinSession(code: string, rawName: string) {
  const session = await loadSessionByCode(code);
  const name = (rawName || "").trim().slice(0, 40);
  if (name.length < 1) throw new ApiError(400, "Ingresa un nombre.");

  const { data: participant, error } = await db()
    .from("participants")
    .insert({ session_id: session.id, name })
    .select()
    .single();
  if (error || !participant) throw new ApiError(500, error?.message ?? "No se pudo unir.");

  const token = generateToken();
  const { error: tErr } = await db()
    .from("participant_secrets")
    .insert({ participant_id: participant.id, token });
  if (tErr) throw new ApiError(500, tErr.message);

  return {
    participantId: participant.id as string,
    token,
    name: participant.name as string,
    session,
  };
}

async function verifyParticipant(
  participantId: string,
  token: string,
): Promise<ParticipantRow> {
  const { data, error } = await db()
    .from("participant_secrets")
    .select("participant_id, token")
    .eq("participant_id", participantId)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!data || data.token !== token) throw new ApiError(401, "Sesión de participante inválida.");

  const { data: p, error: pErr } = await db()
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .single();
  if (pErr || !p) throw new ApiError(404, "Participante no encontrado.");
  return p as ParticipantRow;
}

// ---------------------------------------------------------- enviar decisión
export async function submitDecision(
  participantId: string,
  token: string,
  roundId: string,
  quantity: number,
) {
  const participant = await verifyParticipant(participantId, token);

  const { data: round, error } = await db()
    .from("rounds")
    .select("id, session_id, status")
    .eq("id", roundId)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!round) throw new ApiError(404, "Ronda no encontrada.");
  if (round.session_id !== participant.session_id)
    throw new ApiError(403, "La ronda no pertenece a tu sala.");
  if (round.status !== "open")
    throw new ApiError(409, "La ronda no está abierta para recibir decisiones.");

  const q = clampInt(quantity, 0, 100000);
  const { error: upErr } = await db()
    .from("decisions")
    .upsert(
      { round_id: roundId, participant_id: participantId, quantity: q, submitted_at: new Date().toISOString() },
      { onConflict: "round_id,participant_id" },
    );
  if (upErr) throw new ApiError(500, upErr.message);

  return { ok: true, quantity: q };
}

// ------------------------------------------------ acciones del facilitador
export async function updateRoundConfig(
  code: string,
  pin: string,
  roundNumber: number,
  patch: {
    price?: number;
    cost?: number;
    salvage?: number;
    realDemand?: number;
    hintType?: HintType;
    history?: number[];
  },
) {
  const session = await verifyFacilitator(code, pin);
  const round = await loadRound(session.id, roundNumber);
  if (round.status === "revealed")
    throw new ApiError(409, "No se puede editar una ronda ya revelada.");

  const roundUpdate: Record<string, unknown> = {};
  if (patch.price !== undefined) roundUpdate.price = num(patch.price, round.price);
  if (patch.cost !== undefined) roundUpdate.cost = num(patch.cost, round.cost);
  if (patch.salvage !== undefined) roundUpdate.salvage = num(patch.salvage, round.salvage);
  if (patch.hintType !== undefined) roundUpdate.hint_type = patch.hintType;
  if (patch.history !== undefined) {
    roundUpdate.hint_data = { history: patch.history.map((d) => clampInt(d, 0, 100000)) };
  }
  if (Object.keys(roundUpdate).length > 0) {
    const { error } = await db().from("rounds").update(roundUpdate).eq("id", round.id);
    if (error) throw new ApiError(500, error.message);
  }

  if (patch.realDemand !== undefined) {
    const { error } = await db()
      .from("round_secrets")
      .update({ real_demand: clampInt(patch.realDemand, 0, 100000) })
      .eq("round_id", round.id);
    if (error) throw new ApiError(500, error.message);
  }

  return { ok: true };
}

export async function openRound(code: string, pin: string, roundNumber: number) {
  const session = await verifyFacilitator(code, pin);
  const round = await loadRound(session.id, roundNumber);
  if (round.status === "revealed")
    throw new ApiError(409, "Esta ronda ya fue revelada.");

  const { error } = await db()
    .from("rounds")
    .update({ status: "open", opened_at: new Date().toISOString() })
    .eq("id", round.id);
  if (error) throw new ApiError(500, error.message);

  const { error: sErr } = await db()
    .from("sessions")
    .update({ status: "running", current_round: roundNumber })
    .eq("id", session.id);
  if (sErr) throw new ApiError(500, sErr.message);

  return { ok: true };
}

export async function closeRound(code: string, pin: string, roundNumber: number) {
  const session = await verifyFacilitator(code, pin);
  const round = await loadRound(session.id, roundNumber);
  if (round.status !== "open")
    throw new ApiError(409, "Solo se puede cerrar una ronda abierta.");

  const { error } = await db()
    .from("rounds")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", round.id);
  if (error) throw new ApiError(500, error.message);
  return { ok: true };
}

export async function revealRound(code: string, pin: string, roundNumber: number) {
  const session = await verifyFacilitator(code, pin);
  const round = await loadRound(session.id, roundNumber);
  if (round.status === "revealed")
    throw new ApiError(409, "Esta ronda ya fue revelada.");
  if (round.status === "pending")
    throw new ApiError(409, "Abre y cierra la ronda antes de revelar.");

  const { data: secret, error: secErr } = await db()
    .from("round_secrets")
    .select("real_demand")
    .eq("round_id", round.id)
    .maybeSingle();
  if (secErr) throw new ApiError(500, secErr.message);
  if (!secret) throw new ApiError(500, "Falta la demanda real de la ronda.");
  const realDemand = secret.real_demand as number;

  const { data: participants, error: pErr } = await db()
    .from("participants")
    .select("id, name")
    .eq("session_id", session.id);
  if (pErr) throw new ApiError(500, pErr.message);

  const { data: decisions, error: dErr } = await db()
    .from("decisions")
    .select("participant_id, quantity")
    .eq("round_id", round.id);
  if (dErr) throw new ApiError(500, dErr.message);
  const qtyByParticipant = new Map<string, number>();
  for (const d of decisions ?? []) qtyByParticipant.set(d.participant_id as string, d.quantity as number);

  const params = { price: round.price, cost: round.cost, salvage: round.salvage };
  const resultRows = (participants ?? []).map((p) => {
    const quantity = qtyByParticipant.get(p.id as string) ?? 0;
    const o = computeOutcome(quantity, realDemand, params);
    return {
      session_id: session.id,
      round_id: round.id,
      participant_id: p.id,
      round_number: roundNumber,
      quantity: o.quantity,
      real_demand: o.realDemand,
      units_sold: o.unitsSold,
      leftover: o.leftover,
      lost_sales: o.lostSales,
      revenue: o.revenue,
      salvage_recovery: o.salvageRecovery,
      cost_total: o.costTotal,
      profit: o.profit,
      service_level: o.serviceLevel,
      inventory_efficiency: o.inventoryEfficiency,
    };
  });

  if (resultRows.length > 0) {
    const { error: resErr } = await db()
      .from("results")
      .upsert(resultRows, { onConflict: "round_id,participant_id" });
    if (resErr) throw new ApiError(500, resErr.message);
  }

  const { error: rErr } = await db()
    .from("rounds")
    .update({ status: "revealed", real_demand: realDemand, revealed_at: new Date().toISOString() })
    .eq("id", round.id);
  if (rErr) throw new ApiError(500, rErr.message);

  if (roundNumber >= session.total_rounds) {
    await db().from("sessions").update({ status: "finished" }).eq("id", session.id);
  }

  return { ok: true, realDemand, participants: resultRows.length };
}

/** Estado completo para el panel del facilitador (incluye secretos). */
export async function getFacilitatorState(code: string, pin: string) {
  const session = await verifyFacilitator(code, pin);

  const [{ data: rounds }, { data: secrets }, { data: participants }, { data: results }] =
    await Promise.all([
      db().from("rounds").select("*").eq("session_id", session.id).order("round_number"),
      db().from("round_secrets").select("round_id, real_demand"),
      db().from("participants").select("*").eq("session_id", session.id).order("created_at"),
      db().from("results").select("*").eq("session_id", session.id),
    ]);

  // Mapa de demanda planificada por ronda (secreto, solo facilitador).
  const demandByRound = new Map<string, number>();
  for (const s of secrets ?? []) demandByRound.set(s.round_id as string, s.real_demand as number);

  const roundsWithSecret = (rounds ?? []).map((r) => ({
    ...r,
    planned_demand: demandByRound.get(r.id as string) ?? null,
  }));

  // Decisiones de la ronda actual (secreto: quién envió y cuánto).
  let currentDecisions: { participant_id: string; quantity: number }[] = [];
  const currentRound = (rounds ?? []).find((r) => r.round_number === session.current_round);
  if (currentRound) {
    const { data: decs } = await db()
      .from("decisions")
      .select("participant_id, quantity")
      .eq("round_id", currentRound.id);
    currentDecisions = (decs ?? []) as { participant_id: string; quantity: number }[];
  }

  return {
    session,
    rounds: roundsWithSecret,
    participants: participants ?? [],
    results: results ?? [],
    currentDecisions,
  };
}

// --------------------------------------------------------------- helpers num
function num(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}
function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.round(num(v, min));
  return Math.min(max, Math.max(min, n));
}
