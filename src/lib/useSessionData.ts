"use client";

// Hook que carga los datos PÚBLICOS de una sala (sesión, rondas, participantes,
// resultados) vía la clave anónima y se mantiene al día con Supabase Realtime.
import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/browser";
import type {
  ParticipantRow,
  ResultRow,
  RoundRow,
  SessionRow,
} from "@/lib/types";

export type SessionData = {
  loading: boolean;
  error: string | null;
  session: SessionRow | null;
  rounds: RoundRow[];
  participants: ParticipantRow[];
  results: ResultRow[];
};

const EMPTY: SessionData = {
  loading: true,
  error: null,
  session: null,
  rounds: [],
  participants: [],
  results: [],
};

export function useSessionData(code: string): SessionData {
  const [state, setState] = useState<SessionData>(EMPTY);

  useEffect(() => {
    // Bandera LOCAL a esta ejecución del efecto (no un ref compartido): así, si
    // React Strict Mode monta -> limpia -> vuelve a montar, la ejecución vieja se
    // cancela de verdad y no crea un segundo canal con el mismo topic.
    let cancelled = false;
    const supabase = getBrowserClient();
    let channel: RealtimeChannel | null = null;
    const normalized = code.toUpperCase();

    const set = (patch: Partial<SessionData>) =>
      !cancelled && setState((s) => ({ ...s, ...patch }));

    async function loadRounds(sessionId: string) {
      const { data } = await supabase
        .from("rounds")
        .select("*")
        .eq("session_id", sessionId)
        .order("round_number");
      if (data) set({ rounds: data as RoundRow[] });
    }
    async function loadParticipants(sessionId: string) {
      const { data } = await supabase
        .from("participants")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at");
      if (data) set({ participants: data as ParticipantRow[] });
    }
    async function loadResults(sessionId: string) {
      const { data } = await supabase
        .from("results")
        .select("*")
        .eq("session_id", sessionId)
        .order("round_number");
      if (data) set({ results: data as ResultRow[] });
    }
    async function loadSession(sessionId: string) {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (data) set({ session: data as SessionRow });
    }

    async function init() {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("code", normalized)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        set({ loading: false, error: error.message });
        return;
      }
      if (!session) {
        set({ loading: false, error: "Sala no encontrada." });
        return;
      }
      const sessionId = session.id as string;
      set({ session: session as SessionRow });

      await Promise.all([
        loadRounds(sessionId),
        loadParticipants(sessionId),
        loadResults(sessionId),
      ]);
      // Si el efecto se limpió mientras cargábamos, NO suscribimos: evita crear un
      // canal huérfano / duplicado (causa del error "add callbacks after subscribe").
      if (cancelled) return;
      set({ loading: false, error: null });

      channel = supabase
        .channel(`session:${sessionId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
          () => loadSession(sessionId),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rounds", filter: `session_id=eq.${sessionId}` },
          () => loadRounds(sessionId),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` },
          () => loadParticipants(sessionId),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "results", filter: `session_id=eq.${sessionId}` },
          () => loadResults(sessionId),
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [code]);

  return state;
}
