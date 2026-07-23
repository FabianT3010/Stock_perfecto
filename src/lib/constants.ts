// Configuración por defecto de la simulación y plantillas pedagógicas de rondas.
import type { RoundParams } from "./game";

export const CURRENCY = "Bs";
export const DEFAULT_TOTAL_ROUNDS = 5;

/** Parámetros económicos por defecto (ejemplo del documento: 10 / 5 / 2). */
export const DEFAULT_PARAMS: RoundParams = { price: 10, cost: 5, salvage: 2 };

/** Qué información adicional ve el participante en la ronda. */
export type HintType = "none" | "previous" | "history" | "indicators";

export type RoundTemplate = {
  roundNumber: number;
  title: string;
  hintType: HintType;
  /** Objetivo pedagógico (se muestra al facilitador). */
  objective: string;
};

/** Las 5 rondas con dificultad creciente de información. */
export const ROUND_TEMPLATES: RoundTemplate[] = [
  {
    roundNumber: 1,
    title: "Decisión por intuición",
    hintType: "none",
    objective: "Primera decisión sin datos históricos: experimentar la incertidumbre.",
  },
  {
    roundNumber: 2,
    title: "Decisión con resultados previos",
    hintType: "previous",
    objective: "Ajustar la decisión conociendo lo ocurrido en la ronda anterior.",
  },
  {
    roundNumber: 3,
    title: "Decisión con datos históricos",
    hintType: "history",
    objective: "Estimar mejor usando una tabla de demanda de días anteriores.",
  },
  {
    roundNumber: 4,
    title: "Decisión con indicadores",
    hintType: "indicators",
    objective: "Reducir el riesgo con promedio, mínimo, máximo y variación.",
  },
  {
    roundNumber: 5,
    title: "Decisión final",
    hintType: "none",
    objective: "Última decisión aplicando todo lo aprendido.",
  },
];

/** Demandas reales por defecto (el facilitador las edita antes del evento). */
export const DEFAULT_DEMANDS = [50, 58, 62, 45, 70];

/** Serie de demanda histórica por defecto para las rondas 3 y 4. */
export const DEFAULT_HISTORY = [48, 55, 52, 60, 47, 63, 51, 57];

/** Productos sugeridos para el kiosco. */
export const PRODUCT_OPTIONS = [
  "sándwiches",
  "donas",
  "hamburguesas",
  "snacks",
  "merchandising de feria",
];

export const HINT_LABELS: Record<HintType, string> = {
  none: "Sin datos",
  previous: "Resultado previo",
  history: "Demanda histórica",
  indicators: "Indicadores",
};
