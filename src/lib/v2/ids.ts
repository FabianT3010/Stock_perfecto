// Generadores de identificadores del servidor v2.
import "server-only";
import { randomInt, randomUUID } from "node:crypto";

// Sin caracteres ambiguos (sin O/0/I/1) para dictar el código en voz alta.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código de sala corto y legible, p. ej. "KX7P9". */
export function generateRoomCode(length = 5): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** Código corto que reclama un equipo pre-creado; se imprime solo en su mesa. */
export function generateTeamCode(length = 6): string {
  return generateRoomCode(length);
}

/** PIN de facilitador de 6 dígitos (v2 endurece contra fuerza bruta). */
export function generatePin(): string {
  return String(randomInt(100000, 1000000));
}

/** Token secreto de un equipo (guardado en su navegador). */
export function generateToken(): string {
  return randomUUID();
}

/** Semilla del generador determinista de demanda/histórico de la sesión. */
export function randomSeed(): number {
  return randomInt(1, 2 ** 31 - 1);
}
