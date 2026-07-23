// Cliente Supabase para el navegador (clave anónima). Solo lecturas públicas y
// suscripciones Realtime; todas las escrituras pasan por las rutas del servidor.
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Devuelve un cliente Supabase de navegador (singleton para reusar el socket). */
export function getBrowserClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Configúralas en .env.local (ver .env.local.example).",
    );
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}
