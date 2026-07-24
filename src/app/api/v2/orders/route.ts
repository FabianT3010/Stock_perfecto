import { submitOrders } from "@/lib/v2/store/orders";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";
import type { SubmitOrdersBody } from "@/lib/v2/types";

export async function POST(request: Request) {
  try {
    const { code, teamId, token, roundId, orders } = await readJson<SubmitOrdersBody>(request);
    if (!teamId || !token || !roundId) {
      return Response.json({ error: "Datos de pedido incompletos." }, { status: 400 });
    }
    const result = await submitOrders(code, teamId, token, roundId, orders ?? []);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
