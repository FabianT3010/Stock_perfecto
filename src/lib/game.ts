// Lógica pura del juego "Stock Perfecto" (problema del newsvendor).
// Sin dependencias de framework: se usa igual en el servidor (cálculo al revelar)
// y en el cliente (previsualización / formato). No incluye acceso a datos.

/** Parámetros económicos de una ronda. */
export type RoundParams = {
  /** Precio de venta por unidad. */
  price: number;
  /** Costo unitario de producir/comprar. */
  cost: number;
  /** Valor de recuperación por cada unidad sobrante. */
  salvage: number;
};

/** Resultado calculado de una decisión frente a la demanda real. */
export type RoundOutcome = {
  quantity: number;
  realDemand: number;
  unitsSold: number;
  leftover: number;
  lostSales: number;
  revenue: number;
  salvageRecovery: number;
  costTotal: number;
  profit: number;
  /** Nivel de servicio 0..1 (demanda atendida / demanda real). */
  serviceLevel: number;
  /** Eficiencia de inventario 0..1 (vendidas / preparadas). */
  inventoryEfficiency: number;
};

/**
 * Calcula el resultado de una ronda a partir de la cantidad preparada por el
 * participante y la demanda real revelada por el facilitador.
 *
 *   vendidas   = min(preparadas, demanda)
 *   sobrantes  = preparadas - vendidas
 *   perdidas   = demanda - vendidas
 *   ingreso    = vendidas * precio
 *   recup.     = sobrantes * valor_recuperacion
 *   costo      = preparadas * costo_unitario
 *   ganancia   = ingreso + recuperación - costo
 */
export function computeOutcome(
  quantity: number,
  realDemand: number,
  { price, cost, salvage }: RoundParams,
): RoundOutcome {
  const q = Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
  const d = Math.max(0, Math.floor(Number.isFinite(realDemand) ? realDemand : 0));

  const unitsSold = Math.min(q, d);
  const leftover = q - unitsSold;
  const lostSales = d - unitsSold;

  const revenue = unitsSold * price;
  const salvageRecovery = leftover * salvage;
  const costTotal = q * cost;
  const profit = revenue + salvageRecovery - costTotal;

  const serviceLevel = d > 0 ? unitsSold / d : 1;
  const inventoryEfficiency = q > 0 ? unitsSold / q : 0;

  return {
    quantity: q,
    realDemand: d,
    unitsSold,
    leftover,
    lostSales,
    revenue,
    salvageRecovery,
    costTotal,
    profit,
    serviceLevel,
    inventoryEfficiency,
  };
}

/** Estadísticos de una serie de demanda histórica (para la ronda de indicadores). */
export type DemandIndicators = {
  count: number;
  average: number;
  min: number;
  max: number;
  /** Desviación estándar poblacional (variación). */
  stdDev: number;
  /** Coeficiente de variación (stdDev / promedio), 0..1+. */
  coefVar: number;
};

export function computeIndicators(history: number[]): DemandIndicators | null {
  const xs = history.filter((n) => Number.isFinite(n));
  if (xs.length === 0) return null;
  const count = xs.length;
  const average = xs.reduce((a, b) => a + b, 0) / count;
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const variance = xs.reduce((a, b) => a + (b - average) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);
  const coefVar = average > 0 ? stdDev / average : 0;
  return { count, average, min, max, stdDev, coefVar };
}

/** Fila de resultado agregada por participante, lista para rankear. */
export type ParticipantAggregate = {
  participantId: string;
  name: string;
  cumulativeProfit: number;
  totalLostSales: number;
  totalLeftover: number;
  /** Promedio simple de los niveles de servicio de las rondas jugadas (0..1). */
  avgServiceLevel: number;
  roundsPlayed: number;
};

/** Un resultado individual tal como se almacena / recupera para agregar. */
export type ResultRecord = {
  participantId: string;
  name: string;
  profit: number;
  lostSales: number;
  leftover: number;
  serviceLevel: number;
};

/** Agrega los resultados por participante (suma ganancias, etc.). */
export function aggregateByParticipant(
  results: ResultRecord[],
): ParticipantAggregate[] {
  const map = new Map<string, ParticipantAggregate & { _serviceSum: number }>();
  for (const r of results) {
    let agg = map.get(r.participantId);
    if (!agg) {
      agg = {
        participantId: r.participantId,
        name: r.name,
        cumulativeProfit: 0,
        totalLostSales: 0,
        totalLeftover: 0,
        avgServiceLevel: 0,
        roundsPlayed: 0,
        _serviceSum: 0,
      };
      map.set(r.participantId, agg);
    }
    agg.name = r.name; // el nombre más reciente gana
    agg.cumulativeProfit += r.profit;
    agg.totalLostSales += r.lostSales;
    agg.totalLeftover += r.leftover;
    agg._serviceSum += r.serviceLevel;
    agg.roundsPlayed += 1;
  }
  return [...map.values()].map(({ _serviceSum, ...agg }) => ({
    ...agg,
    avgServiceLevel: agg.roundsPlayed > 0 ? _serviceSum / agg.roundsPlayed : 0,
  }));
}

/**
 * Ordena participantes para el ranking.
 * Criterio principal: mayor ganancia acumulada.
 * Desempates: menores ventas perdidas, menor sobrante, mejor nivel de servicio.
 */
export function rankParticipants(
  aggregates: ParticipantAggregate[],
): (ParticipantAggregate & { rank: number })[] {
  const sorted = [...aggregates].sort((a, b) => {
    if (b.cumulativeProfit !== a.cumulativeProfit)
      return b.cumulativeProfit - a.cumulativeProfit;
    if (a.totalLostSales !== b.totalLostSales)
      return a.totalLostSales - b.totalLostSales;
    if (a.totalLeftover !== b.totalLeftover)
      return a.totalLeftover - b.totalLeftover;
    if (b.avgServiceLevel !== a.avgServiceLevel)
      return b.avgServiceLevel - a.avgServiceLevel;
    return a.name.localeCompare(b.name);
  });
  return sorted.map((agg, i) => ({ ...agg, rank: i + 1 }));
}

/** Convenience: agrega y rankea en un paso. */
export function buildRanking(results: ResultRecord[]) {
  return rankParticipants(aggregateByParticipant(results));
}
