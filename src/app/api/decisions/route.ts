import { submitDecision } from "@/lib/server/store";
import { readJson, toErrorResponse } from "@/lib/server/http";
import type { SubmitDecisionBody } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { participantId, token, roundId, quantity } =
      await readJson<SubmitDecisionBody>(request);
    if (!participantId || !token || !roundId) {
      return Response.json({ error: "Datos de decisión incompletos." }, { status: 400 });
    }
    const result = await submitDecision(participantId, token, roundId, quantity);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
