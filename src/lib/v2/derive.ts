// Derivaciones puras del cliente sobre los datos públicos v2.
import type {
  InventoryLotRow,
  KpiSnapshotRow,
  ProductRow,
  RoundRow,
  SessionRow,
  SupplierOfferRow,
  TeamRow,
} from "@/lib/v2/types";

export type RankedTeam = TeamRow & {
  rank: number;
  avgService: number;
  totalSpoilage: number;
};

/** Ranking por Valor de la Tienda; desempate: mejor servicio, luego menor merma. */
export function rankTeams(teams: TeamRow[], kpis: KpiSnapshotRow[]): RankedTeam[] {
  const spoilageByTeam = new Map<string, number>();
  for (const k of kpis) {
    spoilageByTeam.set(k.team_id, (spoilageByTeam.get(k.team_id) ?? 0) + k.spoilage_cost);
  }
  const enriched = teams.map((t) => ({
    ...t,
    avgService: t.rounds_played > 0 ? t.service_sum / t.rounds_played : 0,
    totalSpoilage: spoilageByTeam.get(t.id) ?? 0,
  }));
  enriched.sort((a, b) => {
    if (b.score_total !== a.score_total) return b.score_total - a.score_total;
    if (b.avgService !== a.avgService) return b.avgService - a.avgService;
    return a.totalSpoilage - b.totalSpoilage;
  });
  return enriched.map((t, i) => ({ ...t, rank: i + 1 }));
}

export function currentRound(rounds: RoundRow[], session: SessionRow | null): RoundRow | null {
  if (!session) return null;
  return rounds.find((r) => r.round_number === session.current_round) ?? null;
}

export type ProductStock = {
  product: ProductRow;
  qty: number;
  value: number; // a costo
  lots: InventoryLotRow[];
};

/** Inventario del equipo agrupado por producto (con sus lotes). */
export function inventoryByProduct(
  lots: InventoryLotRow[],
  products: ProductRow[],
  teamId: string,
): ProductStock[] {
  const mine = lots.filter((l) => l.team_id === teamId && l.qty_remaining > 0);
  return products
    .map((product) => {
      const pl = mine.filter((l) => l.product_id === product.id);
      const qty = pl.reduce((s, l) => s + l.qty_remaining, 0);
      const value = pl.reduce((s, l) => s + l.qty_remaining * l.unit_cost, 0);
      return { product, qty, value, lots: pl };
    })
    .filter((s) => s.qty > 0 || s.product.active_from_round === 1);
}

export function teamKpis(kpis: KpiSnapshotRow[], teamId: string): KpiSnapshotRow[] {
  return kpis
    .filter((k) => k.team_id === teamId)
    .sort((a, b) => a.round_number - b.round_number);
}

export function latestKpi(kpis: KpiSnapshotRow[], teamId: string): KpiSnapshotRow | null {
  const mine = teamKpis(kpis, teamId);
  return mine.length ? mine[mine.length - 1] : null;
}

/** Ofertas de un producto indexadas por proveedor. */
export function offersForProduct(
  offers: SupplierOfferRow[],
  productId: string,
): SupplierOfferRow[] {
  return offers.filter((o) => o.product_id === productId);
}

export function byId<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}
