// Store v2: envío de pedidos con validaciones (cajas, tope Lucho, disponibilidad, caja).
import "server-only";
import { db, loadSessionByCode, verifyTeam } from "./context";
import { ApiError } from "./http";
import type { OrderLine, SupplyConfig } from "@/lib/v2/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const DEFAULT_SUPPLY: SupplyConfig = { luchoCap: 999999, principalAvailable: true, deliveryFactor: 1 };

export async function submitOrders(
  code: string,
  teamId: string,
  token: string,
  roundId: string,
  orders: OrderLine[],
) {
  const session = await loadSessionByCode(code);
  const team = await verifyTeam(teamId, token);
  if (team.session_id !== session.id) throw new ApiError(403, "El equipo no pertenece a esta sala.");

  const { data: round, error: rErr } = await db()
    .from("rounds")
    .select("id, session_id, round_number, status, supply_config")
    .eq("id", roundId)
    .maybeSingle();
  if (rErr) throw new ApiError(500, rErr.message);
  if (!round) throw new ApiError(404, "Ronda no encontrada.");
  if (round.session_id !== session.id) throw new ApiError(403, "La ronda no pertenece a tu sala.");
  if (round.status !== "open") throw new ApiError(409, "La ronda no está abierta para recibir pedidos.");
  const supply = (round.supply_config as SupplyConfig | null) ?? DEFAULT_SUPPLY;
  const R = round.round_number as number;

  // catálogo de la sesión
  const [{ data: offers }, { data: suppliers }, { data: products }] = await Promise.all([
    db().from("supplier_offers").select("*").eq("session_id", session.id),
    db().from("suppliers").select("id, code, is_express").eq("session_id", session.id),
    db().from("products").select("id, name, active_from_round").eq("session_id", session.id),
  ]);
  const offerById = new Map((offers ?? []).map((o) => [o.id as string, o]));
  const supById = new Map((suppliers ?? []).map((s) => [s.id as string, s]));
  const prodById = new Map((products ?? []).map((p) => [p.id as string, p]));

  const rows: Record<string, unknown>[] = [];
  let total = 0;
  for (const line of orders ?? []) {
    if (!line || !line.offerId) continue;
    const qty = Math.round(Number(line.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const offer = offerById.get(line.offerId);
    if (!offer || offer.session_id !== session.id) throw new ApiError(400, "Oferta inválida.");
    if (qty > 5000) throw new ApiError(400, "Cantidad demasiado grande.");
    const pack = Number(offer.pack_size);
    if (qty % pack !== 0) throw new ApiError(400, `Se compra por cajas de ${pack} — ajusta la cantidad.`);

    const prod = prodById.get(offer.product_id as string);
    if (prod && (prod.active_from_round as number) > R) {
      throw new ApiError(400, `${prod.name} recién entra en la semana ${prod.active_from_round}.`);
    }
    const sup = supById.get(offer.supplier_id as string);
    if (sup && !sup.is_express && !supply.principalAvailable) {
      throw new ApiError(409, "El camión (La Principal) no atiende esta semana.");
    }
    if (sup && sup.is_express && qty > supply.luchoCap) {
      throw new ApiError(400, `Don Lucho solo tiene ${supply.luchoCap} por producto esta semana.`);
    }

    const unitCost = Number(offer.unit_cost);
    const totalCost = round2(qty * unitCost);
    total += totalCost;
    rows.push({
      session_id: session.id,
      team_id: teamId,
      round_id: roundId,
      placed_round: R,
      offer_id: offer.id,
      supplier_id: offer.supplier_id,
      product_id: offer.product_id,
      qty,
      unit_cost: unitCost,
      total_cost: totalCost,
      lead_time_rounds: offer.lead_time_rounds,
      arrives_round: R + Number(offer.lead_time_rounds),
      status: "pending",
    });
  }

  total = round2(total);
  if (total > Number(team.cash) + 1e-6) {
    throw new ApiError(409, `No te alcanza la caja: el pedido cuesta Bs ${total} y tienes Bs ${team.cash}.`);
  }

  // replace-all de la ronda: borra lo anterior y reinserta
  await db().from("purchase_orders").delete().eq("team_id", teamId).eq("round_id", roundId);
  if (rows.length) {
    const { error } = await db().from("purchase_orders").insert(rows);
    if (error) throw new ApiError(500, error.message);
  }

  return { ok: true, lines: rows.length, totalCost: total, availableCash: round2(Number(team.cash) - total) };
}
