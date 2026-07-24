// Tipos de las filas de la base de datos v2 (subconjunto público, seguro para el
// cliente) y payloads de la API. Reflejan supabase/schema.sql.

export type SessionStatus = "lobby" | "running" | "finished";
export type RoundStatus = "pending" | "open" | "closed" | "revealed";
export type MoveType = "initial" | "arrival" | "sale" | "spoilage" | "refund";

/** Config de abastecimiento por ronda (pública al abrir; usada por validación y motor). */
export type SupplyConfig = {
  /** Tope de unidades por producto en Don Lucho esta ronda. */
  luchoCap: number;
  /** ¿La Principal (camión) acepta pedidos esta ronda? */
  principalAvailable: boolean;
  /** Fracción de lo pedido que realmente llega (1 = normal; 0.5 = camión a medias). */
  deliveryFactor: number;
};

export type SessionRow = {
  id: string;
  code: string;
  name: string;
  currency: string;
  status: SessionStatus;
  current_round: number;
  total_rounds: number;
  max_teams: number;
  registration_open: boolean;
  default_round_seconds: number;
  starting_cash: number;
  fixed_cost_per_round: number;
  holding_cost_per_unit: number;
  service_bonus_per_pt: number;
  salvage_rate: number;
  history_seed: number;
  created_at: string;
};

export type ProductRow = {
  id: string;
  session_id: string;
  sku: string;
  name: string;
  unit_label: string;
  category: string;
  sale_price: number;
  shelf_life_rounds: number | null;
  active_from_round: number;
  sort_order: number;
};

export type SupplierRow = {
  id: string;
  session_id: string;
  code: string;
  name: string;
  blurb: string;
  is_express: boolean;
  sort_order: number;
};

export type SupplierOfferRow = {
  id: string;
  session_id: string;
  supplier_id: string;
  product_id: string;
  unit_cost: number;
  pack_size: number;
  lead_time_rounds: number;
};

export type TeamRow = {
  id: string;
  session_id: string;
  name: string;
  member_names: string[];
  color: string;
  cash: number;
  debt: number;
  score_total: number;
  service_sum: number;
  rounds_played: number;
  created_at: string;
};

export type RoundRow = {
  id: string;
  session_id: string;
  round_number: number;
  title: string;
  status: RoundStatus;
  event_headline: string | null;
  event_description: string | null;
  event_icon: string | null;
  supply_config: SupplyConfig | null;
  duration_seconds: number;
  opened_at: string | null;
  closes_at: string | null;
  submission_count: number;
  closed_at: string | null;
  revealed_at: string | null;
};

export type InventoryLotRow = {
  id: string;
  session_id: string;
  team_id: string;
  product_id: string;
  acquired_round: number;
  qty_initial: number;
  qty_remaining: number;
  unit_cost: number;
  source: "initial" | "order";
  order_id: string | null;
  expires_after_round: number | null;
};

export type InventoryMoveRow = {
  id: string;
  session_id: string;
  team_id: string;
  product_id: string;
  lot_id: string | null;
  round_number: number;
  type: MoveType;
  qty: number;
};

export type KpiSnapshotRow = {
  id: string;
  session_id: string;
  team_id: string;
  round_id: string;
  round_number: number;
  revenue: number;
  purchases_cash_out: number;
  purchases_refund: number;
  cogs: number;
  holding_cost: number;
  fixed_cost: number;
  spoilage_units: number;
  spoilage_cost: number;
  demand_total: number;
  units_sold: number;
  lost_sales: number;
  service_level: number;
  avg_service_level: number;
  sell_through: number;
  stock_end_units: number;
  stock_end_value: number;
  cash_start: number;
  cash_end: number;
  debt: number;
  profit_round: number;
  profit_cumulative: number;
  score_round: number;
  score_total: number;
};

export type ProductRoundResultRow = {
  id: string;
  session_id: string;
  team_id: string;
  round_id: string;
  round_number: number;
  product_id: string;
  demand_units: number;
  sold_units: number;
  lost_units: number;
  sales_revenue: number;
  lost_revenue: number;
};

export type HistoryWeekRow = {
  id: string;
  session_id: string;
  week_number: number;
  product_id: string;
  units_sold: number;
  lost_sales: number;
  note: string | null;
};

// ---- Payloads de la API ----

export type CreateSessionBody = {
  name?: string;
  pin?: string;
  totalRounds?: number;
  maxTeams?: number;
  roundDurationMinutes?: number;
  economics?: {
    startingCash?: number;
    fixedCost?: number;
    holdingCost?: number;
  };
};

export type JoinBody = {
  code: string;
  teamName?: string;
  teamCode?: string;
  members?: string[];
  token?: string;
};

export type OrderLine = { offerId: string; qty: number };

export type SubmitOrdersBody = {
  code: string;
  teamId: string;
  token: string;
  roundId: string;
  orders: OrderLine[];
};

export type FacilitatorActionBody = { code: string; pin: string };
