import { revealRound } from "@/lib/v2/store/rounds";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";

type Body = { code: string; pin: string; roundNumber: number };

export async function POST(request: Request) {
  try {
    const { code, pin, roundNumber } = await readJson<Body>(request);
    return Response.json(await revealRound(code, pin, roundNumber));
  } catch (e) {
    return toErrorResponse(e);
  }
}
