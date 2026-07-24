// Constructores de series para los gráficos (puros, listos para Recharts).
import type {
  HistoryWeekRow,
  InventoryMoveRow,
  KpiSnapshotRow,
  ProductRow,
} from "@/lib/v2/types";

/** Paleta de series a prueba de daltonismo (Okabe-Ito reordenada, validada CVD). */
export const SERIES_PALETTE = [
  "#0072B2", // azul
  "#009E73", // verde
  "#E69F00", // naranja
  "#CC79A7", // púrpura
  "#56B4E9", // celeste
  "#D55E00", // bermellón
];

export type ChartRow = Record<string, number>;

/** Color estable por producto según su orden (color sigue a la entidad, no al rango). */
export function productColors(products: ProductRow[]): Map<string, string> {
  const sorted = [...products].sort((a, b) => a.sort_order - b.sort_order);
  return new Map(sorted.map((p, i) => [p.id, SERIES_PALETTE[i % SERIES_PALETTE.length]]));
}

/**
 * Ventas por producto por semana: historia (-8..-1, compartida) + juego (1..N,
 * de los movimientos de venta del equipo). Cada producto es una columna (su nombre).
 */
export function salesByProduct(
  history: HistoryWeekRow[],
  moves: InventoryMoveRow[],
  kpis: KpiSnapshotRow[],
  products: ProductRow[],
  teamId: string,
): ChartRow[] {
  const histWeeks = [...new Set(history.map((h) => h.week_number))].sort((a, b) => a - b);
  const gameWeeks = [...new Set(kpis.filter((k) => k.team_id === teamId).map((k) => k.round_number))].sort((a, b) => a - b);
  const rows: ChartRow[] = [];

  for (const w of histWeeks) {
    const row: ChartRow = { week: w };
    for (const p of products) {
      const h = history.find((x) => x.week_number === w && x.product_id === p.id);
      if (h) row[p.name] = h.units_sold;
    }
    rows.push(row);
  }
  for (const w of gameWeeks) {
    const row: ChartRow = { week: w };
    for (const p of products) {
      row[p.name] = moves
        .filter((m) => m.team_id === teamId && m.product_id === p.id && m.round_number === w && m.type === "sale")
        .reduce((s, m) => s + m.qty, 0);
    }
    rows.push(row);
  }
  return rows;
}

function myKpisSorted(kpis: KpiSnapshotRow[], teamId: string): KpiSnapshotRow[] {
  return kpis.filter((k) => k.team_id === teamId).sort((a, b) => a.round_number - b.round_number);
}

/** Caja al cierre y Valor de la Tienda por semana. */
export function moneyByWeek(kpis: KpiSnapshotRow[], teamId: string): ChartRow[] {
  return myKpisSorted(kpis, teamId).map((k) => ({
    week: k.round_number,
    Caja: Math.round(k.cash_end),
    "Valor de la Tienda": Math.round(k.score_total),
  }));
}

/** Nivel de servicio (%) por semana. */
export function serviceByWeek(kpis: KpiSnapshotRow[], teamId: string): ChartRow[] {
  return myKpisSorted(kpis, teamId).map((k) => ({
    week: k.round_number,
    "Servicio (%)": Math.round(k.service_level * 100),
  }));
}

/** Ventas perdidas (unidades) por semana. */
export function lostByWeek(kpis: KpiSnapshotRow[], teamId: string): ChartRow[] {
  return myKpisSorted(kpis, teamId).map((k) => ({
    week: k.round_number,
    "No atendidas": k.lost_sales,
  }));
}
