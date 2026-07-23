// Generadores de identificadores para el servidor (código de sala, PIN, token).
import "server-only";
import { randomInt, randomUUID } from "node:crypto";

// Alfabeto sin caracteres ambiguos (sin O/0/I/1) para dictar el código en voz alta.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código de sala corto y legible, p. ej. "KX7P9M". */
export function generateRoomCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/** PIN numérico de 4 dígitos para el facilitador. */
export function generatePin(): string {
  return String(randomInt(1000, 10000));
}

/** Token secreto del participante (guardado en su navegador). */
export function generateToken(): string {
  return randomUUID();
}
