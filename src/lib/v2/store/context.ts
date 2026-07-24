// Contexto compartido del store v2: acceso a BD (service role) y verificaciones.
import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "./http";
import type { SessionRow, TeamRow } from "@/lib/v2/types";

export function db() {
  return getAdminClient();
}

export async function loadSessionByCode(code: string): Promise<SessionRow> {
  if (!code || typeof code !== "string") throw new ApiError(400, "Falta el código de sala.");
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(404, "Sala no encontrada.");
  return data as SessionRow;
}

const MAX_PIN_ATTEMPTS = 5;
const LOCK_SECONDS = 60;

/** Comparación de strings en tiempo ~constante (evita timing oracle del PIN). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Verifica el PIN con rate-limit persistido en BD (Vercel serverless no comparte memoria). */
export async function verifyFacilitator(code: string, pin: string): Promise<SessionRow> {
  const session = await loadSessionByCode(code);
  const { data: sec, error } = await db()
    .from("session_secrets")
    .select("facilitator_pin, failed_pin_attempts, locked_until")
    .eq("session_id", session.id)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!sec) throw new ApiError(500, "Sesión sin PIN configurado.");

  if (sec.locked_until && new Date(sec.locked_until as string).getTime() > Date.now()) {
    throw new ApiError(429, "Demasiados intentos fallidos. Espera un momento e intenta de nuevo.");
  }

  const ok = safeEqual(String(sec.facilitator_pin), String(pin ?? ""));
  if (!ok) {
    const attempts = (sec.failed_pin_attempts ?? 0) + 1;
    const locked = attempts >= MAX_PIN_ATTEMPTS;
    await db()
      .from("session_secrets")
      .update({
        failed_pin_attempts: locked ? 0 : attempts,
        locked_until: locked ? new Date(Date.now() + LOCK_SECONDS * 1000).toISOString() : null,
      })
      .eq("session_id", session.id);
    throw new ApiError(401, "PIN de facilitador incorrecto.");
  }

  if ((sec.failed_pin_attempts ?? 0) > 0 || sec.locked_until) {
    await db()
      .from("session_secrets")
      .update({ failed_pin_attempts: 0, locked_until: null })
      .eq("session_id", session.id);
  }
  return session;
}

export async function verifyTeam(teamId: string, token: string): Promise<TeamRow> {
  if (!teamId || !token) throw new ApiError(401, "Sesión de equipo inválida.");
  const { data: sec, error } = await db()
    .from("team_secrets")
    .select("token")
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!sec || sec.token !== token) throw new ApiError(401, "Sesión de equipo inválida.");
  const { data: team, error: tErr } = await db().from("teams").select("*").eq("id", teamId).single();
  if (tErr || !team) throw new ApiError(404, "Equipo no encontrado.");
  return team as TeamRow;
}

// ------------------------------------------------------------- utilidades num
export function num(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}
export function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.round(num(v, min));
  return Math.min(max, Math.max(min, n));
}
