import { describe, it, expect } from "vitest";
import {
  closeRoundEngine,
  type EngineConfig,
  type EngineKpi,
  type EngineLot,
  type EngineOrder,
  type EngineProduct,
  type EngineResult,
  type EngineRound,
  type EngineTeam,
} from "./engine";

const CFG: EngineConfig = {
  fixedCostPerRound: 60,
  holdingCostPerUnit: 0.2,
  serviceBonusPerPoint: 5,
  salvageRate: 0.5,
};

const A: EngineProduct = { id: "A", salePrice: 10, shelfLifeRounds: null };

function team(over: Partial<EngineTeam> = {}): EngineTeam {
  return {
    id: "t1",
    cashPrev: 800,
    debtPrev: 0,
    profitCumPrev: 0,
    serviceSumPrev: 0,
    roundsPlayedPrev: 0,
    scoreTotalPrev: 0,
    ...over,
  };
}
const round = (n: number, deliveryFactor = 1): EngineRound => ({ roundNumber: n, deliveryFactor });
const demand = (m: Record<string, number>) => new Map(Object.entries(m));
const kpiOf = (r: EngineResult, teamId = "t1") => r.kpis.find((k) => k.teamId === teamId)!;

// reconstruye lotes y equipo para encadenar rondas en tests
function nextLots(prev: EngineLot[], res: EngineResult, teamId: string): EngineLot[] {
  const patch = new Map(res.lotPatches.map((p) => [p.lotId, p.qtyRemaining]));
  const kept = prev
    .filter((l) => l.teamId === teamId)
    .map((l) => (patch.has(l.id) ? { ...l, qtyRemaining: patch.get(l.id)! } : l))
    .filter((l) => l.qtyRemaining > 0);
  const created = res.newLots
    .filter((n) => n.teamId === teamId)
    .map((n) => ({
      id: n.tempId,
      teamId,
      productId: n.productId,
      qtyRemaining: n.qtyRemaining,
      unitCost: n.unitCost,
      expiresAfterRound: n.expiresAfterRound,
      acquiredRound: n.acquiredRound,
    }))
    .filter((l) => l.qtyRemaining > 0);
  return [...kept, ...created];
}
function nextTeam(prev: EngineTeam, k: EngineKpi): EngineTeam {
  return {
    id: prev.id,
    cashPrev: k.cashEnd,
    debtPrev: k.debt,
    profitCumPrev: k.profitCumulative,
    serviceSumPrev: k.serviceSum,
    roundsPlayedPrev: k.roundsPlayed,
    scoreTotalPrev: k.scoreTotal,
  };
}

const lot = (over: Partial<EngineLot> & Pick<EngineLot, "id">): EngineLot => ({
  teamId: "t1",
  productId: "A",
  qtyRemaining: 0,
  unitCost: 6,
  expiresAfterRound: null,
  acquiredRound: 0,
  ...over,
});
const order = (over: Partial<EngineOrder> & Pick<EngineOrder, "id">): EngineOrder => ({
  teamId: "t1",
  productId: "A",
  qty: 0,
  unitCost: 6,
  totalCost: 0,
  placedRound: 1,
  arrivesRound: 1,
  ...over,
});

describe("closeRoundEngine", () => {
  it("1. entrega express (lead 0) llega y se vende la misma ronda", () => {
    const o = order({ id: "o1", qty: 20, totalCost: 120, placedRound: 1, arrivesRound: 1 });
    const res = closeRoundEngine(round(1), CFG, [A], [team()], [], [o], demand({ A: 15 }));
    const k = kpiOf(res);
    expect(res.newLots[0].qtyInitial).toBe(20);
    expect(k.unitsSold).toBe(15);
    expect(k.stockEndUnits).toBe(5);
    // caja = 800 + 150(venta) − 120(compra) − 1(almacenaje 5×0.2) − 60(fijo)
    expect(k.cashEnd).toBe(769);
    expect(res.deliveredOrderIds).toContain("o1");
  });

  it("2. lead 1: pedido colocado en R1 NO llega en R1 (y caja ≠ ganancia)", () => {
    const o = order({ id: "o1", qty: 20, totalCost: 120, placedRound: 1, arrivesRound: 2 });
    const res = closeRoundEngine(round(1), CFG, [A], [team()], [], [o], demand({ A: 0 }));
    const k = kpiOf(res);
    expect(res.newLots.length).toBe(0); // aún no llega
    expect(k.purchasesCashOut).toBe(120); // pago al pedir
    expect(k.cashEnd).toBe(620); // 800 − 120 − 60
    expect(k.profitRound).toBe(-60); // sólo el costo fijo; la compra no es gasto aún
  });

  it("3. FEFO: consume primero el lote que vence antes, con su costo", () => {
    const lots = [
      lot({ id: "L1", qtyRemaining: 10, unitCost: 5, expiresAfterRound: 2, acquiredRound: 1 }),
      lot({ id: "L2", qtyRemaining: 10, unitCost: 8, expiresAfterRound: null, acquiredRound: 0 }),
    ];
    const res = closeRoundEngine(round(2), CFG, [A], [team()], lots, [], demand({ A: 6 }));
    const k = kpiOf(res);
    expect(k.cogs).toBe(30); // 6 × 5 (de L1), no 6 × 8
    // el resto de L1 (4) vence tras vender
    expect(k.spoilageUnits).toBe(4);
    expect(k.spoilageCost).toBe(20);
    expect(k.stockEndUnits).toBe(10); // sólo queda L2
  });

  it("4. merma: lo que sobra de un lote vencido se pierde a costo pagado", () => {
    const lots = [lot({ id: "L1", qtyRemaining: 10, unitCost: 4, expiresAfterRound: 1 })];
    const res = closeRoundEngine(round(1), CFG, [A], [team()], lots, [], demand({ A: 3 }));
    const k = kpiOf(res);
    expect(k.unitsSold).toBe(3);
    expect(k.spoilageUnits).toBe(7);
    expect(k.spoilageCost).toBe(28);
    expect(k.stockEndUnits).toBe(0);
    expect(res.moves.some((m) => m.type === "spoilage" && m.qty === 7)).toBe(true);
  });

  it("5. demanda faltante lanza error (nunca asume 0 en silencio)", () => {
    expect(() =>
      closeRoundEngine(round(1), CFG, [A], [team()], [], [], new Map()),
    ).toThrow(/falta demanda/i);
  });

  it("6. puntaje = Valor de la Tienda (verificado a mano)", () => {
    const lots = [lot({ id: "L1", qtyRemaining: 100, unitCost: 6 })];
    const res = closeRoundEngine(round(1), CFG, [A], [team()], lots, [], demand({ A: 40 }));
    const k = kpiOf(res);
    expect(k.cashEnd).toBe(1128); // 800 + 400 − 12 − 60
    expect(k.profitRound).toBe(88); // 400 − 240 − 12 − 60
    expect(k.serviceLevel).toBe(1);
    expect(k.stockEndValue).toBe(360); // 60 × 6
    // Valor = caja 1128 + estante 0.5×360=180 + 5×(100%)=500 − deuda 0
    expect(k.scoreTotal).toBe(1808);
    expect(k.scoreRound).toBe(1808);
  });

  it("7. R4: el camión llega a la mitad y reembolsa el resto; express no se afecta", () => {
    // pedido al camión colocado en R3, llega en R4 con factor 0.5
    const o = order({ id: "oCamion", qty: 10, unitCost: 6, totalCost: 60, placedRound: 3, arrivesRound: 4 });
    const res = closeRoundEngine(round(4, 0.5), CFG, [A], [team()], [], [o], demand({ A: 3 }));
    const k = kpiOf(res);
    expect(res.newLots[0].qtyInitial).toBe(5); // mitad de 10
    expect(k.purchasesRefund).toBe(30); // 5 no entregadas × 6
    expect(k.purchasesCashOut).toBe(0); // se pagó en R3
    expect(res.newLots[0].qtyRemaining).toBe(2); // 5 − 3 vendidas
    // caja = 800 + 30(venta) + 30(reembolso) − 0.4(almac 2×0.2) − 60(fijo)
    expect(k.cashEnd).toBe(799.6);
  });

  it("8. deuda: si el costo fijo supera la caja, caja=0 y el faltante es deuda", () => {
    const res = closeRoundEngine(round(1), CFG, [A], [team({ cashPrev: 40 })], [], [], demand({ A: 0 }));
    const k = kpiOf(res);
    expect(k.cashEnd).toBe(0); // 40 − 60 → 0, nunca negativo
    expect(k.debt).toBe(20); // faltante
  });

  it("9. sin backorders: la demanda no atendida es venta perdida", () => {
    const lots = [lot({ id: "L1", qtyRemaining: 10, unitCost: 6 })];
    const res = closeRoundEngine(round(1), CFG, [A], [team()], lots, [], demand({ A: 25 }));
    const k = kpiOf(res);
    expect(k.unitsSold).toBe(10);
    expect(k.lostSales).toBe(15);
    expect(k.serviceLevel).toBeCloseTo(10 / 25, 6);
  });

  it("10. el nivel de servicio promedio se acumula entre rondas", () => {
    const lots0 = [lot({ id: "L1", qtyRemaining: 100, unitCost: 6 })];
    const r1 = closeRoundEngine(round(1), CFG, [A], [team()], lots0, [], demand({ A: 40 }));
    const k1 = kpiOf(r1); // servicio 1
    const lots1 = nextLots(lots0, r1, "t1"); // quedan 60
    const t2 = nextTeam(team(), k1);
    const r2 = closeRoundEngine(round(2), CFG, [A], [t2], lots1, [], demand({ A: 120 }));
    const k2 = kpiOf(r2);
    expect(k2.serviceLevel).toBe(0.5); // 60 / 120
    expect(k2.avgServiceLevel).toBe(0.75); // (1 + 0.5) / 2
    expect(k2.lostSales).toBe(60);
  });

  it("11. no comprar pierde: el fantasma queda por debajo de un comprador razonable", () => {
    const initial = () => [lot({ id: "L0", qtyRemaining: 50, unitCost: 6 })];
    // Fantasma: nunca compra
    let gLots = initial();
    let gTeam = team({ id: "ghost" });
    gLots = gLots.map((l) => ({ ...l, teamId: "ghost" }));
    // Comprador: repone 40 express cada ronda
    let bLots = initial().map((l) => ({ ...l, teamId: "buyer" }));
    let bTeam = team({ id: "buyer" });

    for (const n of [1, 2]) {
      const gRes = closeRoundEngine(round(n), CFG, [A], [gTeam], gLots, [], demand({ A: 40 }));
      gTeam = nextTeam(gTeam, kpiOf(gRes, "ghost"));
      gLots = nextLots(gLots, gRes, "ghost");

      const bOrder = order({ id: `b${n}`, teamId: "buyer", qty: 40, totalCost: 240, placedRound: n, arrivesRound: n });
      const bRes = closeRoundEngine(round(n), CFG, [A], [bTeam], bLots, [bOrder], demand({ A: 40 }));
      bTeam = nextTeam(bTeam, kpiOf(bRes, "buyer"));
      bLots = nextLots(bLots, bRes, "buyer");
    }
    // el comprador gana en Valor de la Tienda pese a haber gastado más caja
    expect(bTeam.scoreTotalPrev).toBeGreaterThan(gTeam.scoreTotalPrev);
  });

  it("12. varios equipos se calculan de forma independiente", () => {
    const teams = [team({ id: "t1" }), team({ id: "t2", cashPrev: 500 })];
    const lots = [
      lot({ id: "L1", teamId: "t1", qtyRemaining: 50, unitCost: 6 }),
      lot({ id: "L2", teamId: "t2", qtyRemaining: 10, unitCost: 6 }),
    ];
    const res = closeRoundEngine(round(1), CFG, [A], teams, lots, [], demand({ A: 40 }));
    expect(kpiOf(res, "t1").unitsSold).toBe(40); // tiene 50
    expect(kpiOf(res, "t2").unitsSold).toBe(10); // sólo tenía 10
    expect(kpiOf(res, "t2").lostSales).toBe(30);
  });
});
