"use client";

// Hook de datos PÚBLICOS de la sala v2, robusto para el aula (celulares que
// bloquean pantalla, wifi intermitente): carga inicial + Realtime con reconexión
// por backoff + polling de respaldo cada 12 s + refetch en visibilitychange/online.
import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/browser";
import type {
  HistoryWeekRow,
  InventoryLotRow,
  InventoryMoveRow,
  KpiSnapshotRow,
  ProductRow,
  ProductRoundResultRow,
  RoundRow,
  SessionRow,
  SupplierOfferRow,
  SupplierRow,
  TeamRow,
} from "@/lib/v2/types";

export type GameData = {
  loading: boolean;
  error: string | null;
  connected: boolean;
  session: SessionRow | null;
  rounds: RoundRow[];
  teams: TeamRow[];
  products: ProductRow[];
  suppliers: SupplierRow[];
  offers: SupplierOfferRow[];
  history: HistoryWeekRow[];
  kpis: KpiSnapshotRow[];
  productResults: ProductRoundResultRow[];
  lots: InventoryLotRow[];
  moves: InventoryMoveRow[];
};

const EMPTY: GameData = {
  loading: true,
  error: null,
  connected: false,
  session: null,
  rounds: [],
  teams: [],
  products: [],
  suppliers: [],
  offers: [],
  history: [],
  kpis: [],
  productResults: [],
  lots: [],
  moves: [],
};

const POLL_MS = 12000;

export function useGameData(code: string): GameData {
  const [state, setState] = useState<GameData>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserClient();
    const normalized = code.toUpperCase();
    let sessionId: string | null = null;
    let channel: RealtimeChannel | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = 1000;

    const set = (patch: Partial<GameData>) =>
      !cancelled && setState((s) => ({ ...s, ...patch }));

    async function loadStatic(sid: string) {
      const [prod, sup, off, hist] = await Promise.all([
        supabase.from("products").select("*").eq("session_id", sid).order("sort_order"),
        supabase.from("suppliers").select("*").eq("session_id", sid).order("sort_order"),
        supabase.from("supplier_offers").select("*").eq("session_id", sid),
        supabase.from("history_weeks").select("*").eq("session_id", sid),
      ]);
      set({
        products: (prod.data ?? []) as ProductRow[],
        suppliers: (sup.data ?? []) as SupplierRow[],
        offers: (off.data ?? []) as SupplierOfferRow[],
        history: (hist.data ?? []) as HistoryWeekRow[],
      });
    }

    async function loadDynamic(sid: string) {
      const [sess, rounds, teams, kpis, productResults] = await Promise.all([
        supabase.from("sessions").select("*").eq("id", sid).maybeSingle(),
        supabase.from("rounds").select("*").eq("session_id", sid).order("round_number"),
        supabase.from("teams").select("*").eq("session_id", sid).order("created_at"),
        supabase.from("kpi_snapshots").select("*").eq("session_id", sid),
        supabase.from("product_round_results").select("*").eq("session_id", sid),
      ]);
      const patch: Partial<GameData> = {};
      if (sess.data) patch.session = sess.data as SessionRow;
      if (rounds.data) patch.rounds = rounds.data as RoundRow[];
      if (teams.data) patch.teams = teams.data as TeamRow[];
      if (kpis.data) patch.kpis = kpis.data as KpiSnapshotRow[];
      if (productResults.data) patch.productResults = productResults.data as ProductRoundResultRow[];
      set(patch);
    }

    async function loadInventory(sid: string) {
      const [lots, moves] = await Promise.all([
        supabase.from("inventory_lots").select("*").eq("session_id", sid),
        supabase.from("inventory_moves").select("*").eq("session_id", sid).order("round_number"),
      ]);
      set({
        lots: (lots.data ?? []) as InventoryLotRow[],
        moves: (moves.data ?? []) as InventoryMoveRow[],
      });
    }

    function subscribe(sid: string) {
      // topic único por intento: evita que supabase-js reutilice un canal ya suscrito
      channel = supabase
        .channel(`game:${sid}:${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sid}` }, () => loadDynamic(sid))
        .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `session_id=eq.${sid}` }, (payload) => {
          loadDynamic(sid);
          if ((payload.new as { status?: string } | null)?.status === "revealed") {
            loadInventory(sid);
          }
        })
        .subscribe((status) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            set({ connected: true });
            backoff = 1000;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            set({ connected: false });
            resubscribe(sid);
          }
        });
    }

    function resubscribe(sid: string) {
      if (cancelled) return;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      const delay = Math.min(backoff, 8000);
      backoff = Math.min(backoff * 2, 8000);
      reTimer = setTimeout(() => {
        if (cancelled) return;
        loadDynamic(sid);
        subscribe(sid);
      }, delay);
    }

    async function init() {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("code", normalized)
        .maybeSingle();
      if (cancelled) return;
      if (error) return set({ loading: false, error: error.message });
      if (!session) return set({ loading: false, error: "Sala no encontrada." });

      sessionId = session.id as string;
      set({ session: session as SessionRow });
      await Promise.all([loadStatic(sessionId), loadDynamic(sessionId), loadInventory(sessionId)]);
      if (cancelled) return;
      set({ loading: false, error: null });

      subscribe(sessionId);
      pollTimer = setInterval(() => {
        if (!cancelled && sessionId) loadDynamic(sessionId);
      }, POLL_MS);
    }

    const onVisible = () => {
      if (!cancelled && sessionId && document.visibilityState === "visible") {
        loadDynamic(sessionId);
        loadInventory(sessionId);
      }
    };
    const onOnline = () => {
      if (!cancelled && sessionId) {
        loadDynamic(sessionId);
        loadInventory(sessionId);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
      if (reTimer) clearTimeout(reTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [code]);

  return state;
}
