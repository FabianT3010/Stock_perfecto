// Tipos de las filas de la base de datos (subconjunto público, seguro para el
// cliente) y de los payloads de la API. Deben reflejar supabase/schema.sql.
import type { HintType } from "./constants";

export type SessionStatus = "lobby" | "running" | "finished";
export type RoundStatus = "pending" | "open" | "closed" | "revealed";

/** Fila pública de `sessions` (sin secretos). */
export type SessionRow = {
  id: string;
  code: string;
  name: string;
  product_label: string;
  currency: string;
  status: SessionStatus;
  current_round: number;
  total_rounds: number;
  created_at: string;
};

/** Fila pública de `rounds`. `real_demand` es NULL hasta que se revela. */
export type RoundRow = {
  id: string;
  session_id: string;
  round_number: number;
  price: number;
  cost: number;
  salvage: number;
  status: RoundStatus;
  real_demand: number | null;
  hint_type: HintType;
  hint_data: HintData | null;
  opened_at: string | null;
  closed_at: string | null;
  revealed_at: string | null;
};

/** Datos de pista mostrados al participante según la ronda (públicos). */
export type HintData = {
  /** Serie de demanda histórica (ronda 3 y base de indicadores). */
  history?: number[];
};

/** Fila pública de `participants`. */
export type ParticipantRow = {
  id: string;
  session_id: string;
  name: string;
  created_at: string;
};

/** Fila pública de `results` (publicada al revelar). */
export type ResultRow = {
  id: string;
  session_id: string;
  round_id: string;
  participant_id: string;
  round_number: number;
  quantity: number;
  real_demand: number;
  units_sold: number;
  leftover: number;
  lost_sales: number;
  revenue: number;
  salvage_recovery: number;
  cost_total: number;
  profit: number;
  service_level: number;
  inventory_efficiency: number;
  created_at: string;
};

// ---- Payloads de la API ----

export type CreateSessionBody = {
  name: string;
  productLabel: string;
  pin: string;
  totalRounds?: number;
  params?: { price: number; cost: number; salvage: number };
  demands?: number[];
  history?: number[];
};

export type JoinBody = {
  code: string;
  name: string;
};

export type JoinResponse = {
  participantId: string;
  token: string;
  name: string;
  session: SessionRow;
};

export type SubmitDecisionBody = {
  participantId: string;
  token: string;
  roundId: string;
  quantity: number;
};

export type FacilitatorActionBody = {
  code: string;
  pin: string;
};
