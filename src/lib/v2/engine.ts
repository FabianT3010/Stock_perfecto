// Motor de cierre de ronda de "La Tiendita de Doña Peta".
// Función PURA, sin I/O, determinista, testeable con vitest. La usa el servidor
// (store/rounds.ts#revealRound): carga todo, llama al motor, persiste el output.
//
// Reglas y puntaje: PLAN-V2.md §2/§4. Orden de operaciones (§4.4):
//   1 LLEGADAS  2 DEMANDA  3 VENTAS(FEFO)  4 MERMAS  5 COSTOS  6 CAJA/PUNTAJE
//
// Puntaje — Valor de la Tienda (PLAN §2):
//   Caja + (estante vigente × salvageRate) + (Bs por punto × % servicio prom.) − Deuda

import type { MoveType } from "./types";

// ---------------------------------------------------------------- entradas
export type EngineConfig = {
  fixedCostPerRound: number;
  holdingCostPerUnit: number;
  /** Bs por cada punto de % de servicio promedio. */
  serviceBonusPerPoint: number;
  /** Fracción del costo a la que vale el estante vigente (0.5 = mitad). */
  salvageRate: number;
};

export type EngineProduct = {
  id: string;
  salePrice: number;
  shelfLifeRounds: number | null;
};

export type EngineLot = {
  id: string;
  teamId: string;
  productId: string;
  qtyRemaining: number;
  unitCost: number;
  expiresAfterRound: number | null;
  acquiredRound: number;
};

export type EngineOrder = {
  id: string;
  teamId: string;
  productId: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  placedRound: number;
  arrivesRound: number;
};

export type EngineTeam = {
  id: string;
  cashPrev: number;
  debtPrev: number;
  profitCumPrev: number;
  serviceSumPrev: number;
  roundsPlayedPrev: number;
  scoreTotalPrev: number;
};

export type EngineRound = {
  roundNumber: number;
  /** Fracción de lo pedido que realmente llega (1 normal, 0.5 R4). */
  deliveryFactor: number;
  /** Reembolsos de entregas del camión ya acreditados al abrir la ronda. */
  openingRefundByTeam?: ReadonlyMap<string, number>;
};

// ---------------------------------------------------------------- salidas
export type EngineMove = {
  teamId: string;
  productId: string;
  lotId: string | null; // lote existente
  newLotTempId: string | null; // lote nuevo de esta ronda
  roundNumber: number;
  type: MoveType;
  qty: number;
};

export type EngineNewLot = {
  tempId: string;
  teamId: string;
  productId: string;
  acquiredRound: number;
  qtyInitial: number;
  qtyRemaining: number;
  unitCost: number;
  orderId: string;
  expiresAfterRound: number | null;
};

export type EngineLotPatch = { lotId: string; qtyRemaining: number };

export type EngineKpi = {
  teamId: string;
  revenue: number;
  purchasesCashOut: number;
  purchasesRefund: number;
  cogs: number;
  holdingCost: number;
  fixedCost: number;
  spoilageUnits: number;
  spoilageCost: number;
  demandTotal: number;
  unitsSold: number;
  lostSales: number;
  serviceLevel: number;
  avgServiceLevel: number;
  sellThrough: number;
  stockEndUnits: number;
  stockEndValue: number;
  cashStart: number;
  cashEnd: number;
  debt: number;
  profitRound: number;
  profitCumulative: number;
  scoreRound: number;
  scoreTotal: number;
  // para persistir en teams:
  serviceSum: number;
  roundsPlayed: number;
};

export type EngineResult = {
  kpis: EngineKpi[];
  moves: EngineMove[];
  newLots: EngineNewLot[];
  lotPatches: EngineLotPatch[];
  deliveredOrderIds: string[];
};

// Copia de trabajo de un lote durante el cálculo.
type WorkLot = {
  id: string | null; // null si es nuevo
  tempId: string | null;
  productId: string;
  qtyRemaining: number;
  unitCost: number;
  expiresAfterRound: number | null;
  acquiredRound: number;
  isNew: boolean;
  newRef: EngineNewLot | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Cierra una ronda para todos los equipos. `demand` DEBE tener una entrada por
 * cada producto (Map productId → demanda); si falta, lanza (nunca asume 0).
 */
export function closeRoundEngine(
  roundInfo: EngineRound,
  config: EngineConfig,
  products: EngineProduct[],
  teams: EngineTeam[],
  lots: EngineLot[],
  orders: EngineOrder[],
  demand: Map<string, number>,
): EngineResult {
  const R = roundInfo.roundNumber;

  // Validación dura: demanda para todos los productos.
  for (const p of products) {
    if (!demand.has(p.id)) {
      throw new Error(`Motor: falta demanda para el producto ${p.id} en la ronda ${R}`);
    }
  }

  const moves: EngineMove[] = [];
  const newLots: EngineNewLot[] = [];
  const lotPatches: EngineLotPatch[] = [];
  const deliveredOrderIds: string[] = [];
  const kpis: EngineKpi[] = [];
  let lotCounter = 0;

  const lotsByTeam = new Map<string, EngineLot[]>();
  for (const l of lots) {
    if (!lotsByTeam.has(l.teamId)) lotsByTeam.set(l.teamId, []);
    lotsByTeam.get(l.teamId)!.push(l);
  }
  const ordersByTeam = new Map<string, EngineOrder[]>();
  for (const o of orders) {
    if (!ordersByTeam.has(o.teamId)) ordersByTeam.set(o.teamId, []);
    ordersByTeam.get(o.teamId)!.push(o);
  }
  const shelfLife = new Map(products.map((p) => [p.id, p.shelfLifeRounds]));

  for (const team of teams) {
    // set de trabajo mutable: lotes existentes del equipo
    const work: WorkLot[] = (lotsByTeam.get(team.id) ?? []).map((l) => ({
      id: l.id,
      tempId: null,
      productId: l.productId,
      qtyRemaining: l.qtyRemaining,
      unitCost: l.unitCost,
      expiresAfterRound: l.expiresAfterRound,
      acquiredRound: l.acquiredRound,
      isNew: false,
      newRef: null,
    }));
    const myOrders = ordersByTeam.get(team.id) ?? [];

    // 1) LLEGADAS (con factor de entrega; el faltante se reembolsa)
    let purchasesRefund = roundInfo.openingRefundByTeam?.get(team.id) ?? 0;
    let refundsAppliedAtClose = 0;
    for (const o of myOrders) {
      if (o.arrivesRound !== R) continue;
      deliveredOrderIds.push(o.id);
      // El factor de entrega parcial (R4: camión plantado) sólo afecta al camión,
      // es decir, a pedidos colocados en rondas anteriores (lead ≥ 1). La entrega
      // express de Don Lucho (colocada y recibida esta misma ronda) llega completa.
      const isTruckDelivery = o.placedRound < R;
      const factor = isTruckDelivery ? roundInfo.deliveryFactor : 1;
      const deliveredQty = Math.floor(o.qty * factor);
      const undelivered = o.qty - deliveredQty;
      if (undelivered > 0) {
        const refund = undelivered * o.unitCost;
        purchasesRefund += refund;
        refundsAppliedAtClose += refund;
        moves.push({ teamId: team.id, productId: o.productId, lotId: null, newLotTempId: null, roundNumber: R, type: "refund", qty: undelivered });
      }
      if (deliveredQty > 0) {
        const life = shelfLife.get(o.productId) ?? null;
        const expires = life != null ? R + life - 1 : null;
        const tempId = `new-${lotCounter++}`;
        const nl: EngineNewLot = {
          tempId,
          teamId: team.id,
          productId: o.productId,
          acquiredRound: R,
          qtyInitial: deliveredQty,
          qtyRemaining: deliveredQty,
          unitCost: o.unitCost,
          orderId: o.id,
          expiresAfterRound: expires,
        };
        newLots.push(nl);
        work.push({
          id: null,
          tempId,
          productId: o.productId,
          qtyRemaining: deliveredQty,
          unitCost: o.unitCost,
          expiresAfterRound: expires,
          acquiredRound: R,
          isNew: true,
          newRef: nl,
        });
        moves.push({ teamId: team.id, productId: o.productId, lotId: null, newLotTempId: tempId, roundNumber: R, type: "arrival", qty: deliveredQty });
      }
    }

    // 2) CAJA SALIENTE: se paga lo PEDIDO en esta ronda (pago al pedir)
    const purchasesCashOut = myOrders
      .filter((o) => o.placedRound === R)
      .reduce((s, o) => s + o.totalCost, 0);

    // 3) DEMANDA Y VENTAS (FEFO: primero lo que vence antes)
    let revenue = 0;
    let cogs = 0;
    let unitsSold = 0;
    let lostSales = 0;
    let demandTotal = 0;
    for (const p of products) {
      const D = demand.get(p.id)!;
      demandTotal += D;
      if (D <= 0) continue;
      const lotsP = work
        .filter((l) => l.productId === p.id && l.qtyRemaining > 0)
        .sort((a, b) => {
          const ea = a.expiresAfterRound ?? Infinity;
          const eb = b.expiresAfterRound ?? Infinity;
          if (ea !== eb) return ea - eb;
          return a.acquiredRound - b.acquiredRound;
        });
      let remaining = D;
      for (const l of lotsP) {
        if (remaining <= 0) break;
        const take = Math.min(l.qtyRemaining, remaining);
        l.qtyRemaining -= take;
        remaining -= take;
        revenue += take * p.salePrice;
        cogs += take * l.unitCost;
        unitsSold += take;
        moves.push({ teamId: team.id, productId: p.id, lotId: l.id, newLotTempId: l.tempId, roundNumber: R, type: "sale", qty: take });
      }
      lostSales += remaining;
    }

    // 4) MERMAS: lotes vencidos tras vender
    let spoilageUnits = 0;
    let spoilageCost = 0;
    for (const l of work) {
      if (l.expiresAfterRound != null && l.expiresAfterRound <= R && l.qtyRemaining > 0) {
        spoilageUnits += l.qtyRemaining;
        spoilageCost += l.qtyRemaining * l.unitCost;
        moves.push({ teamId: team.id, productId: l.productId, lotId: l.id, newLotTempId: l.tempId, roundNumber: R, type: "spoilage", qty: l.qtyRemaining });
        l.qtyRemaining = 0;
      }
    }

    // 5) ALMACENAJE + FIJO
    let stockEndUnits = 0;
    let stockEndValue = 0;
    for (const l of work) {
      stockEndUnits += l.qtyRemaining;
      stockEndValue += l.qtyRemaining * l.unitCost;
    }
    const holdingCost = round2(stockEndUnits * config.holdingCostPerUnit);
    const fixedCost = config.fixedCostPerRound;

    // 6) CAJA, GANANCIA, DEUDA (caja ≠ ganancia, a propósito)
    const cashStart = team.cashPrev;
    const cashRaw = round2(
      cashStart + revenue + refundsAppliedAtClose - purchasesCashOut - holdingCost - fixedCost,
    );
    const newDebt = cashRaw < 0 ? -cashRaw : 0;
    const cashEnd = cashRaw < 0 ? 0 : cashRaw;
    const debt = round2(team.debtPrev + newDebt);
    const profitRound = round2(revenue - cogs - spoilageCost - holdingCost - fixedCost);
    const profitCumulative = round2(team.profitCumPrev + profitRound);

    // 7) KPIs
    const serviceLevel = demandTotal > 0 ? unitsSold / demandTotal : 1;
    const available = unitsSold + stockEndUnits + spoilageUnits;
    const sellThrough = available > 0 ? unitsSold / available : 0;
    const serviceSum = team.serviceSumPrev + serviceLevel;
    const roundsPlayed = team.roundsPlayedPrev + 1;
    const avgServiceLevel = serviceSum / roundsPlayed;

    // PUNTAJE — Valor de la Tienda (PLAN §2)
    const shelfValue = config.salvageRate * stockEndValue;
    const scoreTotal = round2(
      cashEnd + shelfValue + config.serviceBonusPerPoint * (avgServiceLevel * 100) - debt,
    );
    const scoreRound = round2(scoreTotal - team.scoreTotalPrev);

    kpis.push({
      teamId: team.id,
      revenue: round2(revenue),
      purchasesCashOut: round2(purchasesCashOut),
      purchasesRefund: round2(purchasesRefund),
      cogs: round2(cogs),
      holdingCost,
      fixedCost,
      spoilageUnits,
      spoilageCost: round2(spoilageCost),
      demandTotal,
      unitsSold,
      lostSales,
      serviceLevel,
      avgServiceLevel,
      sellThrough,
      stockEndUnits,
      stockEndValue: round2(stockEndValue),
      cashStart: round2(cashStart),
      cashEnd,
      debt,
      profitRound,
      profitCumulative,
      scoreRound,
      scoreTotal,
      serviceSum,
      roundsPlayed,
    });

    // parches de lotes existentes (qty final) y qty final de lotes nuevos
    for (const l of work) {
      if (l.isNew && l.newRef) l.newRef.qtyRemaining = l.qtyRemaining;
      else if (l.id) lotPatches.push({ lotId: l.id, qtyRemaining: l.qtyRemaining });
    }
  }

  return { kpis, moves, newLots, lotPatches, deliveredOrderIds };
}
