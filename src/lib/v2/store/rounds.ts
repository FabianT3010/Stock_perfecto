// Store v2: ciclo de vida de la ronda (abrir / cerrar / revelar con el motor / editar).
import "server-only";
import { randomUUID } from "node:crypto";
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
import { PRODUCTS } from "@/lib/v2/constants";

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

  // precondición: demanda completa para todos los productos
  const [{ count: prodCount }, { count: demandCount }] = await Promise.all([
    db().from("products").select("*", { count: "exact", head: true }).eq("session_id", session.id),
    db().from("demand_plan").select("*", { count: "exact", head: true }).eq("round_id", round.id),
  ]);
  if ((demandCount ?? 0) < (prodCount ?? 0)) {
    throw new ApiError(409, "Falta configurar la demanda de todos los productos en esta ronda.");
  }

  const { error } = await db().rpc("open_game_round", {
    p_session_id: session.id,
    p_round_number: roundNumber,
    p_duration_seconds: null,
  });
  if (error) throw new ApiError(409, error.message);
  return { ok: true };
}

export async function closeRound(code: string, pin: string, roundNumber: number) {
  const session = await verifyFacilitator(code, pin);
  const { error } = await db().rpc("close_game_round", {
    p_session_id: session.id,
    p_round_number: roundNumber,
  });
  if (error) throw new ApiError(409, error.message);
  return { ok: true };
}

export async function setRoundTime(code: string, pin: string, roundNumber: number, seconds: number) {
  const session = await verifyFacilitator(code, pin);
  const safeSeconds = Math.max(30, Math.min(7200, Math.round(Number(seconds))));
  const { error } = await db().rpc("set_game_round_time", {
    p_session_id: session.id,
    p_round_number: roundNumber,
    p_seconds: safeSeconds,
  });
  if (error) throw new ApiError(409, error.message);
  return { ok: true };
}

export async function revealRound(code: string, pin: string, roundNumber: number) {
  const session = await verifyFacilitator(code, pin);
  const round = await loadRound(session.id, roundNumber);
  if (round.status === "revealed") throw new ApiError(409, "Esta ronda ya fue revelada.");
  if (round.status !== "closed") throw new ApiError(409, "Cierra la ronda antes de revelar.");

  // ---- cargar entradas del motor ----
  const [
    { data: products },
    { data: teams },
    { data: prevSnaps },
    { data: lotsData },
    { data: ordersData },
    { data: demandData },
    { data: submissions },
    { data: suppliers },
    { data: offers },
  ] = await Promise.all([
    db().from("products").select("id, sku, sale_price, shelf_life_rounds").eq("session_id", session.id),
    db().from("teams").select("id, cash, debt, score_total, service_sum, rounds_played").eq("session_id", session.id),
    db().from("kpi_snapshots").select("team_id, profit_cumulative").eq("session_id", session.id).eq("round_number", roundNumber - 1),
    db().from("inventory_lots").select("id, team_id, product_id, qty_remaining, unit_cost, expires_after_round, acquired_round").eq("session_id", session.id).gt("qty_remaining", 0),
    db().from("purchase_orders").select("id, team_id, product_id, qty, unit_cost, total_cost, placed_round, arrives_round").eq("session_id", session.id).eq("status", "pending"),
    db().from("demand_plan").select("product_id, planned_demand").eq("round_id", round.id),
    db().from("order_submissions").select("team_id").eq("round_id", round.id),
    db().from("suppliers").select("id, code").eq("session_id", session.id),
    db().from("supplier_offers").select("id, supplier_id, product_id, unit_cost, lead_time_rounds").eq("session_id", session.id),
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

  type AutoOrder = EngineOrder & {
    offerId: string;
    supplierId: string;
    leadTimeRounds: number;
  };
  const autoOrders: AutoOrder[] = [];
  if (roundNumber === 1) {
    const submitted = new Set((submissions ?? []).map((row) => row.team_id as string));
    const luchoId = (suppliers ?? []).find((supplier) => supplier.code === "LUCHO")?.id as string | undefined;
    const seedBySku = new Map(PRODUCTS.map((product) => [product.sku, product]));
    const onHand = new Map<string, number>();
    for (const lot of lotsData ?? []) {
      const key = `${lot.team_id}:${lot.product_id}`;
      onHand.set(key, (onHand.get(key) ?? 0) + Number(lot.qty_remaining));
    }

    for (const team of teams ?? []) {
      const teamId = team.id as string;
      if (submitted.has(teamId)) continue;
      let budget = Number(team.cash);
      for (const product of products ?? []) {
        const seed = seedBySku.get(product.sku as string);
        if (!seed || seed.activeFromRound > 1 || !luchoId) continue;
        const offer = (offers ?? []).find(
          (candidate) => candidate.supplier_id === luchoId && candidate.product_id === product.id,
        );
        if (!offer) continue;
        const target = Math.ceil(seed.baseDemand * 0.6);
        const available = onHand.get(`${teamId}:${product.id}`) ?? 0;
        const qty = Math.min(40, Math.max(0, target - available));
        const unitCost = Number(offer.unit_cost);
        const totalCost = Math.round(qty * unitCost * 100) / 100;
        if (qty <= 0 || totalCost > budget) continue;
        budget -= totalCost;
        autoOrders.push({
          id: randomUUID(),
          teamId,
          productId: product.id as string,
          qty,
          unitCost,
          totalCost,
          placedRound: 1,
          arrivesRound: 1,
          offerId: offer.id as string,
          supplierId: luchoId,
          leadTimeRounds: Number(offer.lead_time_rounds),
        });
      }
    }
    engineOrders.push(...autoOrders);
  }
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

  // Persistencia atómica en PostgreSQL: o se publica TODO o no cambia nada.
  const orderIdByTempId = new Map(result.newLots.map((n) => [n.tempId, n.orderId]));
  const productResults = (teams ?? []).flatMap((team) =>
    (products ?? []).map((product) => {
      const soldUnits = result.moves
        .filter(
          (move) =>
            move.teamId === team.id &&
            move.productId === product.id &&
            move.type === "sale",
        )
        .reduce((sum, move) => sum + move.qty, 0);
      const demandUnits = demand.get(product.id as string) ?? 0;
      const lostUnits = Math.max(0, demandUnits - soldUnits);
      const salePrice = Number(product.sale_price);
      return {
        team_id: team.id,
        product_id: product.id,
        demand_units: demandUnits,
        sold_units: soldUnits,
        lost_units: lostUnits,
        sales_revenue: Math.round(soldUnits * salePrice * 100) / 100,
        lost_revenue: Math.round(lostUnits * salePrice * 100) / 100,
      };
    }),
  );
  const { error: applyError } = await db().rpc("apply_round_result", {
    p_session_id: session.id,
    p_round_id: round.id,
    p_round_number: roundNumber,
    p_auto_orders: autoOrders.map((order) => ({
      id: order.id,
      team_id: order.teamId,
      offer_id: order.offerId,
      supplier_id: order.supplierId,
      product_id: order.productId,
      qty: order.qty,
      unit_cost: order.unitCost,
      total_cost: order.totalCost,
      lead_time_rounds: order.leadTimeRounds,
      arrives_round: order.arrivesRound,
    })),
    p_new_lots: result.newLots.map((n) => ({
      team_id: n.teamId,
      product_id: n.productId,
      acquired_round: n.acquiredRound,
      qty_initial: n.qtyInitial,
      qty_remaining: n.qtyRemaining,
      unit_cost: n.unitCost,
      order_id: n.orderId,
      expires_after_round: n.expiresAfterRound,
    })),
    p_lot_patches: result.lotPatches.map((p) => ({
      lot_id: p.lotId,
      qty_remaining: p.qtyRemaining,
    })),
    p_moves: result.moves.map((m: EngineMove) => ({
      team_id: m.teamId,
      product_id: m.productId,
      lot_id: m.lotId,
      order_id: m.newLotTempId ? orderIdByTempId.get(m.newLotTempId) ?? null : null,
      type: m.type,
      qty: m.qty,
    })),
    p_delivered_order_ids: result.deliveredOrderIds,
    p_product_results: productResults,
    p_kpis: result.kpis.map((k) => ({
      team_id: k.teamId,
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
      service_sum: k.serviceSum,
      rounds_played: k.roundsPlayed,
    })),
    p_finish: roundNumber >= session.total_rounds,
  });
  if (applyError) throw new ApiError(409, applyError.message);

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
