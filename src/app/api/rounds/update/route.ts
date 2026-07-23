import { updateRoundConfig } from "@/lib/server/store";
import { readJson, toErrorResponse } from "@/lib/server/http";
import type { HintType } from "@/lib/constants";

type Body = {
  code: string;
  pin: string;
  roundNumber: number;
  price?: number;
  cost?: number;
  salvage?: number;
  realDemand?: number;
  hintType?: HintType;
  history?: number[];
};

export async function POST(request: Request) {
  try {
    const { code, pin, roundNumber, ...patch } = await readJson<Body>(request);
    const result = await updateRoundConfig(code, pin, roundNumber, patch);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
