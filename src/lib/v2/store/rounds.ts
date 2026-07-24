// Store v2: ciclo de vida de la ronda (abrir / cerrar / revelar con el motor / editar).
import "server-only";
import { db, verifyFacilitator } from "./context";
import { ApiError } from "./http";
import {
  closeRoundEngine,
  type EngineConfig,
  type EngineLot,
  type EngineMove,
  type EngineOrder,
  type EngineProduct,
  type EngineTeam,
} from "@/lib/v2/engine";
import type { SupplyConfig } from "@/lib/v2/types";

async function loadRound(sessionId: string, roundNumber: number) {
  const { data, error } = await db()
    .from("rounds")
    .select("id, session_id, round_number, status, supply_config")
    .eq("session_id", sessionId)
    .eq("round_number", roundNumber)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(404, "Ronda no encontrada.");
  return data;
}

export async function openRound(code: string, pin: string, roundNumber: number) {
  const session = await verifyFacilitator(code, pin);
  const round = await loadRound(session.id, roundNumber);
  if (round.status === "revealed") throw new ApiError(409, "Esta ronda ya fue revelada.");
  if (round.status === "open") return { ok: true };

  // precondición: demanda completa para todos los productos
  const [{ count: prodCount }, { count: demandCount }] = await Promise.all([
    db().from("products").select("*", { count: "exact", head: true }).eq("session_id", session.id),
    db().from("demand_plan").select("*", { count: "exact", head: true }).eq("round_id", round.id),
  ]);
  if ((demandCount ?? 0) < (prodCount ?? 0)) {
    throw new ApiError(409, "Falta configurar la demanda de todos los productos en esta ronda.");
  }

  // copiar evento + config de abasto (secretos hasta ahora) a la ronda pública
  const { data: plan } = await db()
    .from("round_plans")
    .select("event_headline, event_description, event_icon, supply_config")
    .eq("round_id", round.id)
    .maybeSingle();

  const { error } = await db()
    .from("rounds")
    .update({
      status: "open",
      opened_at: new Date().toISOString(),
      event_headline: plan?.event_headline ?? null,
      event_description: plan?.event_description ?? null,
      event_icon: plan?.event_icon ?? null,
      supply_config: plan?.supply_config ?? null,
    })
    .eq("id", round.id);
  if (error) throw new ApiError(500, error.message);

  await db()
    .from("sessions")
    .update({ status: "running", current_round: roundNumber })
    .eq("id", session.id);
  return { ok: true };
}

export async function closeRound(code: string, pin: string, roundNumber: number) {
  const session = await verifyFacilitator(code, pin);
  const round = await loadRound(session.id, roundNumber);
  if (round.status !== "open") throw new ApiError(409, "Solo se puede cerrar una ronda abierta.");
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
  if (round.status === "revealed") throw new ApiError(409, "Esta ronda ya fue revelada.");
  if (round.status !== "closed") throw new ApiError(409, "Cierra la ronda antes de revelar.");

  // lock optimista: solo un reveal gana (idempotente ante doble clic)
  const { data: locked, error: lockErr } = await db()
    .from("rounds")
    .update({ status: "revealed", revealed_at: new Date().toISOString() })
    .eq("id", round.id)
    .eq("status", "closed")
    .select("id");
  if (lockErr) throw new ApiError(500, lockErr.message);
  if (!locked || locked.length === 0) throw new ApiError(409, "La ronda ya fue revelada.");

  // ---- cargar entradas del motor ----
  const [
    { data: products },
    { data: teams },
    { data: prevSnaps },
    { data: lotsData },
    { data: ordersData },
    { data: demandData },
  ] = await Promise.all([
    db().from("products").select("id, sale_price, shelf_life_rounds").eq("session_id", session.id),
    db().from("teams").select("id, cash, debt, score_total, service_sum, rounds_played").eq("session_id", session.id),
    db().from("kpi_snapshots").select("team_id, profit_cumulative").eq("session_id", session.id).eq("round_number", roundNumber - 1),
    db().from("inventory_lots").select("id, team_id, product_id, qty_remaining, unit_cost, expires_after_round, acquired_round").eq("session_id", session.id).gt("qty_remaining", 0),
    db().from("purchase_orders").select("id, team_id, product_id, qty, unit_cost, total_cost, placed_round, arrives_round").eq("session_id", session.id).eq("status", "pending"),
    db().from("demand_plan").select("product_id, planned_demand").eq("round_id", round.id),
  ]);

  const engineProducts: EngineProduct[] = (products ?? []).map((p) => ({
    id: p.id as string,
    salePrice: Number(p.sale_price),
    shelfLifeRounds: p.shelf_life_rounds as number | null,
  }));
  const profitCumByTeam = new Map((prevSnaps ?? []).map((s) => [s.team_id as string, Number(s.profit_cumulative)]));
  const engineTeams: EngineTeam[] = (teams ?? []).map((t) => ({
    id: t.id as string,
    cashPrev: Number(t.cash),
    debtPrev: Number(t.debt),
    profitCumPrev: profitCumByTeam.get(t.id as string) ?? 0,
    serviceSumPrev: Number(t.service_sum),
    roundsPlayedPrev: Number(t.rounds_played),
    scoreTotalPrev: Number(t.score_total),
  }));
  const engineLots: EngineLot[] = (lotsData ?? []).map((l) => ({
    id: l.id as string,
    teamId: l.team_id as string,
    productId: l.product_id as string,
    qtyRemaining: Number(l.qty_remaining),
    unitCost: Number(l.unit_cost),
    expiresAfterRound: l.expires_after_round as number | null,
    acquiredRound: Number(l.acquired_round),
  }));
  const engineOrders: EngineOrder[] = (ordersData ?? []).map((o) => ({
    id: o.id as string,
    teamId: o.team_id as string,
    productId: o.product_id as string,
    qty: Number(o.qty),
    unitCost: Number(o.unit_cost),
    totalCost: Number(o.total_cost),
    placedRound: Number(o.placed_round),
    arrivesRound: Number(o.arrives_round),
  }));
  const demand = new Map((demandData ?? []).map((d) => [d.product_id as string, Number(d.planned_demand)]));

  const config: EngineConfig = {
    fixedCostPerRound: Number(session.fixed_cost_per_round),
    holdingCostPerUnit: Number(session.holding_cost_per_unit),
    serviceBonusPerPoint: Number(session.service_bonus_per_pt),
    salvageRate: Number(session.salvage_rate),
  };
  const deliveryFactor = (round.supply_config as SupplyConfig | null)?.deliveryFactor ?? 1;

  const result = closeRoundEngine(
    { roundNumber, deliveryFactor },
    config,
    engineProducts,
    engineTeams,
    engineLots,
    engineOrders,
    demand,
  );

  // ---- persistencia (orden importa) ----
  // 1) lotes nuevos (llegadas)
  let lotIdByOrderId = new Map<string, string>();
  if (result.newLots.length) {
    const { data: inserted, error } = await db()
      .from("inventory_lots")
      .insert(
        result.newLots.map((n) => ({
          session_id: session.id,
          team_id: n.teamId,
          product_id: n.productId,
          acquired_round: n.acquiredRound,
          qty_initial: n.qtyInitial,
          qty_remaining: n.qtyRemaining,
          unit_cost: n.unitCost,
          source: "order",
          order_id: n.orderId,
          expires_after_round: n.expiresAfterRound,
        })),
      )
      .select("id, order_id");
    if (error) throw new ApiError(500, error.message);
    lotIdByOrderId = new Map((inserted ?? []).map((r) => [r.order_id as string, r.id as string]));
  }
  const orderIdByTempId = new Map(result.newLots.map((n) => [n.tempId, n.orderId]));
  const resolveLot = (m: EngineMove): string | null => {
    if (m.lotId) return m.lotId;
    if (m.newLotTempId) return lotIdByOrderId.get(orderIdByTempId.get(m.newLotTempId) ?? "") ?? null;
    return null;
  };

  // 2) parches de qty de lotes existentes
  await Promise.all(
    result.lotPatches.map((p) =>
      db().from("inventory_lots").update({ qty_remaining: p.qtyRemaining }).eq("id", p.lotId),
    ),
  );

  // 3) movimientos (ledger)
  if (result.moves.length) {
    await db().from("inventory_moves").insert(
      result.moves.map((m) => ({
        session_id: session.id,
        team_id: m.teamId,
        product_id: m.productId,
        lot_id: resolveLot(m),
        round_number: m.roundNumber,
        type: m.type,
        qty: m.qty,
      })),
    );
  }

  // 4) pedidos entregados
  if (result.deliveredOrderIds.length) {
    await db().from("purchase_orders").update({ status: "delivered" }).in("id", result.deliveredOrderIds);
  }

  // 5) snapshots de KPI
  await db()
    .from("kpi_snapshots")
    .upsert(
      result.kpis.map((k) => ({
        session_id: session.id,
        team_id: k.teamId,
        round_id: round.id,
        round_number: roundNumber,
        revenue: k.revenue,
        purchases_cash_out: k.purchasesCashOut,
        purchases_refund: k.purchasesRefund,
        cogs: k.cogs,
        holding_cost: k.holdingCost,
        fixed_cost: k.fixedCost,
        spoilage_units: k.spoilageUnits,
        spoilage_cost: k.spoilageCost,
        demand_total: k.demandTotal,
        units_sold: k.unitsSold,
        lost_sales: k.lostSales,
        service_level: k.serviceLevel,
        avg_service_level: k.avgServiceLevel,
        sell_through: k.sellThrough,
        stock_end_units: k.stockEndUnits,
        stock_end_value: k.stockEndValue,
        cash_start: k.cashStart,
        cash_end: k.cashEnd,
        debt: k.debt,
        profit_round: k.profitRound,
        profit_cumulative: k.profitCumulative,
        score_round: k.scoreRound,
        score_total: k.scoreTotal,
      })),
      { onConflict: "team_id,round_id" },
    );

  // 6) actualizar equipos
  await Promise.all(
    result.kpis.map((k) =>
      db()
        .from("teams")
        .update({
          cash: k.cashEnd,
          debt: k.debt,
          score_total: k.scoreTotal,
          service_sum: k.serviceSum,
          rounds_played: k.roundsPlayed,
        })
        .eq("id", k.teamId),
    ),
  );

  // 7) ¿fin del juego?
  if (roundNumber >= session.total_rounds) {
    await db().from("sessions").update({ status: "finished" }).eq("id", session.id);
  }

  return { ok: true, teams: result.kpis.length };
}

type UpdatePatch = {
  demands?: { productId: string; planned: number }[];
  event?: { headline: string; description: string; icon: string };
  title?: string;
};

export async function updateRound(code: string, pin: string, roundNumber: number, patch: UpdatePatch) {
  const session = await verifyFacilitator(code, pin);
  const round = await loadRound(session.id, roundNumber);
  if (round.status === "revealed") throw new ApiError(409, "No se puede editar una ronda ya revelada.");

  if (patch.demands?.length) {
    await Promise.all(
      patch.demands.map((d) =>
        db()
          .from("demand_plan")
          .update({ planned_demand: Math.max(0, Math.round(Number(d.planned))) })
          .eq("round_id", round.id)
          .eq("product_id", d.productId),
      ),
    );
  }
  if (patch.event) {
    await db()
      .from("round_plans")
      .update({
        event_headline: patch.event.headline,
        event_description: patch.event.description,
        event_icon: patch.event.icon,
      })
      .eq("round_id", round.id);
    if (round.status === "open") {
      await db()
        .from("rounds")
        .update({
          event_headline: patch.event.headline,
          event_description: patch.event.description,
          event_icon: patch.event.icon,
        })
        .eq("id", round.id);
    }
  }
  if (patch.title) {
    await db().from("rounds").update({ title: patch.title }).eq("id", round.id);
  }
  return { ok: true };
}
