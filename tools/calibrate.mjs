// Arnés de calibración de "La Tiendita de Doña Peta".
// Reutiliza el MOTOR REAL (src/lib/v2/engine.ts) + el seed, para que el balance
// se valide con exactamente la misma lógica que juega el evento (sin una 2ª fórmula).
//
// Simula varias estrategias de compra durante las 5 semanas y reporta el
// Valor de la Tienda final. Criterios de aceptación (PLAN §4.5):
//   - la analítica gana por margen claro
//   - el fantasma queda último
//   - JIT-Lucho (comprar todo caro al rival) NO gana
//
// Uso:  node tools/calibrate.mjs [semilla]
import { closeRoundEngine } from "../src/lib/v2/engine.ts";
import {
  ECONOMICS,
  OFFERS,
  PRODUCTS,
  ROUND_SCRIPTS,
  initialLotCost,
} from "../src/lib/v2/constants.ts";
import { generateDemandPlan } from "../src/lib/v2/seed.ts";

const SEED = Number(process.argv[2] ?? 12345);
const ROUNDS = ROUND_SCRIPTS.length;
const STARTING_CASH = ECONOMICS.startingCash;

const config = {
  fixedCostPerRound: ECONOMICS.fixedCostPerRound,
  holdingCostPerUnit: ECONOMICS.holdingCostPerUnit,
  serviceBonusPerPoint: ECONOMICS.serviceBonusPerPoint,
  salvageRate: ECONOMICS.salvageRate,
};
const engineProducts = PRODUCTS.map((p) => ({
  id: p.sku,
  salePrice: p.salePrice,
  shelfLifeRounds: p.shelfLifeRounds,
}));
const baseBySku = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p.baseDemand]));
const activeFrom = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p.activeFromRound]));

const demandPlan = generateDemandPlan(SEED);
const demandForRound = (r) =>
  new Map(demandPlan.filter((d) => d.roundNumber === r).map((d) => [d.sku, d.planned]));

function initialLots(teamId) {
  return PRODUCTS.filter((p) => p.startingStock > 0).map((p) => ({
    id: `init-${teamId}-${p.sku}`,
    teamId,
    productId: p.sku,
    qtyRemaining: p.startingStock,
    unitCost: initialLotCost(p.sku),
    expiresAfterRound: p.initialExpiresAfterRound,
    acquiredRound: 0,
  }));
}

const offer = (sku, sup) => OFFERS[sup][sku]; // {unitCost, packSize}
const leadOf = (sup) => (sup === "PRINCIPAL" ? 1 : 0);
const roundUpPack = (qty, pack) => Math.ceil(qty / pack) * pack;

// ---- estrategias ----------------------------------------------------------
// Cada una devuelve órdenes [{sku, sup, qty}] dado el contexto de la semana.
// ctx: { r, supply, onhand(sku), incoming(sku), cash }
function eventMult(r, sku) {
  return ROUND_SCRIPTS[r - 1].multipliers[sku] ?? 1;
}

function coverTo(target, sku, ctx, preferSupplier) {
  const have = ctx.onhand(sku) + ctx.incoming(sku);
  const need = Math.max(0, Math.ceil(target) - have);
  if (need <= 0) return [];
  const sup = preferSupplier;
  if (sup === "PRINCIPAL" && !ctx.supply.principalAvailable) return [];
  const pack = offer(sku, sup).packSize;
  let qty = roundUpPack(need, pack);
  if (sup === "LUCHO") qty = Math.min(qty, Math.floor(ctx.supply.luchoCap / pack) * pack || 0);
  return qty > 0 ? [{ sku, sup, qty }] : [];
}

const STRATEGIES = {
  fantasma: () => [],

  conservadora: (ctx) =>
    PRODUCTS.filter((p) => activeFrom[p.sku] <= ctx.r).flatMap((p) => {
      const sup = ctx.supply.principalAvailable ? "PRINCIPAL" : "LUCHO";
      return coverTo(0.6 * baseBySku[p.sku], p.sku, ctx, sup);
    }),

  agresiva: (ctx) =>
    PRODUCTS.filter((p) => activeFrom[p.sku] <= ctx.r).flatMap((p) => {
      const sup = ctx.supply.principalAvailable ? "PRINCIPAL" : "LUCHO";
      return coverTo(1.5 * baseBySku[p.sku], p.sku, ctx, sup);
    }),

  // Lee el afiche a medias, planifica con el camión y tapa faltantes con Lucho.
  analitica: (ctx) => {
    const out = [];
    for (const p of PRODUCTS) {
      if (activeFrom[p.sku] > ctx.r) continue;
      const estThis = baseBySku[p.sku] * (1 + 0.85 * (eventMult(ctx.r, p.sku) - 1)) * 1.1;
      // faltante de ESTA semana → Lucho (llega hoy)
      out.push(...coverTo(estThis, p.sku, ctx, "LUCHO"));
    }
    // planifica la PRÓXIMA semana con el camión (más barato)
    if (ctx.supply.principalAvailable && ctx.r < ROUNDS) {
      for (const p of PRODUCTS) {
        if (activeFrom[p.sku] > ctx.r + 1) continue;
        const estNext = baseBySku[p.sku] * (1 + 0.85 * (eventMult(ctx.r + 1, p.sku) - 1)) * 1.05;
        const pack = offer(p.sku, "PRINCIPAL").packSize;
        out.push({ sku: p.sku, sup: "PRINCIPAL", qty: roundUpPack(estNext, pack) });
      }
    }
    return out;
  },

  // Compra TODO caro al rival, cada semana, justo lo de hoy.
  jitLucho: (ctx) =>
    PRODUCTS.filter((p) => activeFrom[p.sku] <= ctx.r).flatMap((p) =>
      coverTo(baseBySku[p.sku] * (1 + 0.85 * (eventMult(ctx.r, p.sku) - 1)), p.sku, ctx, "LUCHO"),
    ),

  // Caza servicio comprando de más a Lucho (capado).
  maxServicio: (ctx) =>
    PRODUCTS.filter((p) => activeFrom[p.sku] <= ctx.r).flatMap((p) =>
      coverTo(1.4 * baseBySku[p.sku] * eventMult(ctx.r, p.sku), p.sku, ctx, "LUCHO"),
    ),
};

// ---- simulación -----------------------------------------------------------
function simulate() {
  const names = Object.keys(STRATEGIES);
  const teams = names.map((id) => ({
    id, cashPrev: STARTING_CASH, debtPrev: 0, profitCumPrev: 0,
    serviceSumPrev: 0, roundsPlayedPrev: 0, scoreTotalPrev: 0,
  }));
  const lots = new Map(names.map((id) => [id, initialLots(id)]));
  const pending = new Map(names.map((id) => [id, []])); // órdenes no entregadas
  let orderSeq = 0;
  const perRound = [];

  for (let r = 1; r <= ROUNDS; r++) {
    const supply = ROUND_SCRIPTS[r - 1].supply;
    const dem = demandForRound(r);
    const allOrders = [];

    for (const t of teams) {
      const myLots = lots.get(t.id);
      const onhandMap = {};
      for (const l of myLots) onhandMap[l.productId] = (onhandMap[l.productId] ?? 0) + l.qtyRemaining;
      const incMap = {};
      for (const o of pending.get(t.id)) if (o.arrivesRound === r) incMap[o.productId] = (incMap[o.productId] ?? 0) + o.qty;

      const ctx = {
        r, supply,
        onhand: (sku) => onhandMap[sku] ?? 0,
        incoming: (sku) => incMap[sku] ?? 0,
      };
      // La app protege una caída técnica en R1 con un pedido conservador automático.
      let desired =
        t.id === "fantasma" && r === 1
          ? STRATEGIES.conservadora(ctx)
          : STRATEGIES[t.id](ctx);

      // materializar a órdenes con costo; aplicar tope de caja (recorte codicioso)
      let priced = desired
        .filter((d) => d.qty > 0)
        .map((d) => {
          const of = offer(d.sku, d.sup);
          return { ...d, unitCost: of.unitCost, pack: of.packSize, total: d.qty * of.unitCost, lead: leadOf(d.sup) };
        });
      // recorte por caja: quita cajas del más caro hasta que entre
      let budget = t.cashPrev;
      let spent = priced.reduce((s, o) => s + o.total, 0);
      priced.sort((a, b) => b.unitCost - a.unitCost);
      let gi = 0;
      while (spent > budget + 1e-6 && priced.length) {
        const o = priced[gi % priced.length];
        o.qty -= o.pack;
        o.total = o.qty * o.unitCost;
        if (o.qty <= 0) priced = priced.filter((x) => x !== o);
        spent = priced.reduce((s, x) => s + x.total, 0);
        gi++;
        if (gi > 100000) break;
      }

      for (const o of priced) {
        const eo = {
          id: `o${orderSeq++}`, teamId: t.id, productId: o.sku, qty: o.qty,
          unitCost: o.unitCost, totalCost: Math.round(o.qty * o.unitCost * 100) / 100,
          placedRound: r, arrivesRound: r + o.lead,
        };
        allOrders.push(eo);
        pending.get(t.id).push(eo);
      }
    }

    // correr el motor con las órdenes pendientes de todos
    const flatPending = teams.flatMap((t) => pending.get(t.id));
    const res = closeRoundEngine(
      { roundNumber: r, deliveryFactor: supply.deliveryFactor },
      config, engineProducts, teams, teams.flatMap((t) => lots.get(t.id)), flatPending, dem,
    );

    // aplicar salidas: lotes, equipos, entregas
    const delivered = new Set(res.deliveredOrderIds);
    const patch = new Map(res.lotPatches.map((p) => [p.lotId, p.qtyRemaining]));
    for (const t of teams) {
      const kept = lots.get(t.id)
        .map((l) => (patch.has(l.id) ? { ...l, qtyRemaining: patch.get(l.id) } : l))
        .filter((l) => l.qtyRemaining > 0);
      const created = res.newLots.filter((n) => n.teamId === t.id).map((n) => ({
        id: n.tempId, teamId: t.id, productId: n.productId, qtyRemaining: n.qtyRemaining,
        unitCost: n.unitCost, expiresAfterRound: n.expiresAfterRound, acquiredRound: n.acquiredRound,
      })).filter((l) => l.qtyRemaining > 0);
      lots.set(t.id, [...kept, ...created]);
      pending.set(t.id, pending.get(t.id).filter((o) => !delivered.has(o.id)));
      const k = res.kpis.find((x) => x.teamId === t.id);
      t.cashPrev = k.cashEnd; t.debtPrev = k.debt; t.profitCumPrev = k.profitCumulative;
      t.serviceSumPrev = k.serviceSum; t.roundsPlayedPrev = k.roundsPlayed; t.scoreTotalPrev = k.scoreTotal;
    }
    perRound.push(res.kpis);
  }

  return teams.map((t) => {
    const lastK = perRound[ROUNDS - 1].find((k) => k.teamId === t.id);
    return {
      id: t.id, valor: t.scoreTotalPrev, cash: t.cashPrev, debt: t.debtPrev,
      avgService: lastK.avgServiceLevel, profitCum: t.profitCumPrev,
    };
  });
}

// ---- reporte + veredicto --------------------------------------------------
const results = simulate().sort((a, b) => b.valor - a.valor);
console.log(`\nCalibración — semilla ${SEED} · caja ${STARTING_CASH} · fijo ${config.fixedCostPerRound} · almacenaje ${config.holdingCostPerUnit}\n`);
console.log("estrategia".padEnd(14), "Valor".padStart(9), "Caja".padStart(9), "Deuda".padStart(7), "Servicio".padStart(9), "Ganancia".padStart(9));
for (const r of results) {
  console.log(
    r.id.padEnd(14),
    Math.round(r.valor).toString().padStart(9),
    Math.round(r.cash).toString().padStart(9),
    Math.round(r.debt).toString().padStart(7),
    (Math.round(r.avgService * 1000) / 10 + "%").padStart(9),
    Math.round(r.profitCum).toString().padStart(9),
  );
}

const winner = results[0].id;
const last = results[results.length - 1].id;
const jit = results.find((r) => r.id === "jitLucho");
const ana = results.find((r) => r.id === "analitica");
const second = results.find((r) => r.id !== "analitica"); // mejor no-analítica (orden desc)
const checks = [
  ["analítica gana", winner === "analitica"],
  ["fantasma último", last === "fantasma"],
  ["analítica > JIT-Lucho", ana.valor > jit.valor],
  ["margen analítica ≥ 8% sobre el 2º", ana.valor >= second.valor * 1.08],
];
console.log("\nCriterios:");
let allPass = true;
for (const [label, pass] of checks) { console.log(` ${pass ? "OK  " : "FAIL"} ${label}`); if (!pass) allPass = false; }
console.log(allPass ? "\n== BALANCE OK ✅ ==" : "\n== AJUSTAR NÚMEROS ❌ ==");
process.exit(allPass ? 0 : 1);
