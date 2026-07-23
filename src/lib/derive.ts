// Derivaciones sobre los datos públicos (ranking, historial por participante).
import { buildRanking, type ResultRecord, type RoundOutcome } from "./game";
import type { ParticipantRow, ResultRow } from "./types";

/** Convierte una fila de resultado almacenada en un RoundOutcome para la UI. */
export function resultRowToOutcome(r: ResultRow): RoundOutcome {
  return {
    quantity: r.quantity,
    realDemand: r.real_demand,
    unitsSold: r.units_sold,
    leftover: r.leftover,
    lostSales: r.lost_sales,
    revenue: r.revenue,
    salvageRecovery: r.salvage_recovery,
    costTotal: r.cost_total,
    profit: r.profit,
    serviceLevel: r.service_level,
    inventoryEfficiency: r.inventory_efficiency,
  };
}

/** Convierte filas de resultados + participantes en registros para agregar. */
export function toResultRecords(
  results: ResultRow[],
  participants: ParticipantRow[],
): ResultRecord[] {
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  return results.map((r) => ({
    participantId: r.participant_id,
    name: nameById.get(r.participant_id) ?? "—",
    profit: r.profit,
    lostSales: r.lost_sales,
    leftover: r.leftover,
    serviceLevel: r.service_level,
  }));
}

/** Ranking completo (con posiciones y desempates). */
export function rankingFrom(
  results: ResultRow[],
  participants: ParticipantRow[],
) {
  return buildRanking(toResultRecords(results, participants));
}

/** Resultados de un participante ordenados por ronda. */
export function participantResults(
  results: ResultRow[],
  participantId: string,
): ResultRow[] {
  return results
    .filter((r) => r.participant_id === participantId)
    .sort((a, b) => a.round_number - b.round_number);
}

/** Ganancia acumulada de un participante. */
export function cumulativeProfit(
  results: ResultRow[],
  participantId: string,
): number {
  return participantResults(results, participantId).reduce(
    (sum, r) => sum + r.profit,
    0,
  );
}
