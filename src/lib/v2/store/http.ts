// Helpers HTTP + error tipado para los route handlers v2.
import "server-only";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "El cuerpo de la solicitud no es JSON válido.");
  }
}

export function toErrorResponse(e: unknown): Response {
  if (e instanceof ApiError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error("[api v2] error no controlado:", e);
  return Response.json({ error: "Error interno del servidor." }, { status: 500 });
}
