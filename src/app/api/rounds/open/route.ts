import { openRound } from "@/lib/server/store";
import { readJson, toErrorResponse } from "@/lib/server/http";

type Body = { code: string; pin: string; roundNumber: number };

export async function POST(request: Request) {
  try {
    const { code, pin, roundNumber } = await readJson<Body>(request);
    const result = await openRound(code, pin, roundNumber);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
