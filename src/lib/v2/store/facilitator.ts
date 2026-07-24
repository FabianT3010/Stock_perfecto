// Store v2: estado completo del facilitador (incluye secretos) y expulsar equipo.
import "server-only";
import { db, verifyFacilitator } from "./context";
import { ApiError } from "./http";

export async function getFacilitatorState(code: string, pin: string) {
  const session = await verifyFacilitator(code, pin);
  const sid = session.id;

  const [
    { data: rounds },
    { data: teams },
    { data: products },
    { data: suppliers },
    { data: offers },
    { data: demandPlan },
    { data: snapshots },
    { data: roundPlans },
    { data: teamSecrets },
  ] = await Promise.all([
    db().from("rounds").select("*").eq("session_id", sid).order("round_number"),
    db().from("teams").select("*").eq("session_id", sid).order("created_at"),
    db().from("products").select("*").eq("session_id", sid).order("sort_order"),
    db().from("suppliers").select("*").eq("session_id", sid).order("sort_order"),
    db().from("supplier_offers").select("*").eq("session_id", sid),
    db().from("demand_plan").select("round_id, product_id, planned_demand").eq("session_id", sid),
    db().from("kpi_snapshots").select("*").eq("session_id", sid),
    db().from("round_plans").select("*"),
    db().from("team_secrets").select("team_id, join_code"),
  ]);

  // qué equipos ya enviaron pedido en la ronda en curso
  const currentRound = (rounds ?? []).find((r) => r.round_number === session.current_round);
  let submittedTeamIds: string[] = [];
  if (currentRound) {
    const { data: submissions } = await db()
      .from("order_submissions")
      .select("team_id")
      .eq("round_id", currentRound.id);
    submittedTeamIds = [...new Set((submissions ?? []).map((o) => o.team_id as string))];
  }

  const planIds = new Set((rounds ?? []).map((r) => r.id));
  const plansForSession = (roundPlans ?? []).filter((p) => planIds.has(p.round_id));
  const teamIds = new Set((teams ?? []).map((t) => t.id));
  const teamCredentials = (teamSecrets ?? []).filter((s) => teamIds.has(s.team_id));

  return {
    session,
    rounds: rounds ?? [],
    teams: teams ?? [],
    products: products ?? [],
    suppliers: suppliers ?? [],
    offers: offers ?? [],
    demandPlan: demandPlan ?? [],
    snapshots: snapshots ?? [],
    roundPlans: plansForSession,
    teamCredentials,
    submittedTeamIds,
  };
}

export async function kickTeam(code: string, pin: string, teamId: string) {
  const session = await verifyFacilitator(code, pin);
  if (session.status !== "lobby") {
    throw new ApiError(409, "No se pueden eliminar equipos después de iniciar el juego.");
  }
  const { data: team } = await db()
    .from("teams")
    .select("id, session_id")
    .eq("id", teamId)
    .maybeSingle();
  if (!team || team.session_id !== session.id) {
    throw new ApiError(404, "Equipo no encontrado en esta sala.");
  }
  const { error } = await db().from("teams").delete().eq("id", teamId);
  if (error) throw new ApiError(500, error.message);
  return { ok: true };
}

export async function setRegistration(code: string, pin: string, open: boolean) {
  const session = await verifyFacilitator(code, pin);
  if (session.status !== "lobby") {
    throw new ApiError(409, "Las inscripciones quedan cerradas al iniciar el juego.");
  }
  const { error } = await db()
    .from("sessions")
    .update({ registration_open: open })
    .eq("id", session.id);
  if (error) throw new ApiError(500, error.message);
  return { ok: true, registrationOpen: open };
}
