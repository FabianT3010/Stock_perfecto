// Helpers compartidos para los route handlers.
import "server-only";
import { ApiError } from "./store";

/** Parsea el body JSON o lanza 400. */
export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "El cuerpo de la solicitud no es JSON válido.");
  }
}

/** Convierte cualquier error en una respuesta JSON con el status adecuado. */
export function toErrorResponse(e: unknown): Response {
  if (e instanceof ApiError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error("[api] error no controlado:", e);
  return Response.json({ error: "Error interno del servidor." }, { status: 500 });
}
