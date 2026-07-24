// Generadores deterministas (PRNG con semilla) del histórico de 8 semanas y del
// plan de demanda de las 5 rondas. Puros: misma semilla ⇒ mismos datos.
// La demanda se "hornea" una vez al crear la sesión (idéntica para los 20 equipos).
import {
  HISTORY_CONFIG,
  HISTORY_WEEKS,
  PRODUCTS,
  ROUND_SCRIPTS,
} from "./constants.ts";

/** PRNG mulberry32: determinista y rápido. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido uniforme en [-amp, +amp]. */
function noise(rng: () => number, amp: number): number {
  return (rng() * 2 - 1) * amp;
}

export type DemandPlanEntry = {
  roundNumber: number;
  sku: string;
  planned: number;
};

/**
 * Demanda planificada por ronda × producto = baseDemand × multiplicador de evento
 * × (1 ± 10% de ruido). Los productos aún no activos rinden 0 (pero igual consumen
 * el PRNG para que la semilla sea estable).
 */
export function generateDemandPlan(seed: number): DemandPlanEntry[] {
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const out: DemandPlanEntry[] = [];
  for (const script of ROUND_SCRIPTS) {
    for (const p of PRODUCTS) {
      const nz = noise(rng, 0.1);
      let planned = 0;
      if (script.roundNumber >= p.activeFromRound) {
        const mult = script.multipliers[p.sku] ?? 1;
        planned = Math.max(0, Math.round(p.baseDemand * mult * (1 + nz)));
      }
      out.push({ roundNumber: script.roundNumber, sku: p.sku, planned });
    }
  }
  return out;
}

export type HistoryEntry = {
  weekNumber: number; // -8 .. -1
  sku: string;
  unitsSold: number;
  lostSales: number;
  note: string | null;
};

/**
 * 8 semanas previas de la tienda, sólo para los productos que existen desde R1
 * (huevos y detergente son líneas nuevas que entran en R2, sin historia).
 * Tendencia leve + ruido ±20% + una semana marcada con pico ("Festival del colegio").
 */
export function generateHistory(seed: number): HistoryEntry[] {
  const rng = mulberry32((seed ^ 0x85ebca6b) >>> 0);
  const cfg = HISTORY_CONFIG;
  // El cuaderno histórico cubre todo el catálogo, incluso los productos que la
  // tienda empieza a gestionar recién en R2.
  const histProducts = PRODUCTS;
  const out: HistoryEntry[] = [];
  for (let w = -HISTORY_WEEKS; w <= -1; w++) {
    const weeksFromStart = w + HISTORY_WEEKS; // 0..7
    const isMarked = w === cfg.markedWeek;
    for (const p of histProducts) {
      const nz = noise(rng, cfg.noiseAmplitude);
      const trend = Math.pow(1 + cfg.trendPerWeek, weeksFromStart);
      const mark = isMarked ? cfg.markedMultipliers[p.sku] ?? 1 : 1;
      const units = Math.max(0, Math.round(p.baseDemand * trend * mark * (1 + nz)));
      const lostRoll = rng();
      const lost =
        lostRoll < cfg.lostSalesWeekChance
          ? Math.round(p.baseDemand * 0.08 * rng())
          : 0;
      out.push({
        weekNumber: w,
        sku: p.sku,
        unitsSold: units,
        lostSales: lost,
        note: isMarked ? cfg.markedNote : null,
      });
    }
  }
  return out;
}
