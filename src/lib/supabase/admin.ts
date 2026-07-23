// Cliente Supabase con la SERVICE ROLE KEY. Bypassa RLS: usar SOLO en el
// servidor (route handlers). Nunca importar desde componentes de cliente.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/** Cliente con privilegios de servicio para todas las escrituras/lecturas server-side. */
export function getAdminClient(): SupabaseClient {
  if (admin) return admin;

  // El servidor puede necesitar una URL distinta a la del navegador (p. ej. en
  // Docker: el navegador usa 127.0.0.1 y el contenedor host.docker.internal).
  // SUPABASE_URL tiene prioridad; si no, cae a la pública.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.",
    );
  }

  admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
