import { getFacilitatorState } from "@/lib/server/store";
import { readJson, toErrorResponse } from "@/lib/server/http";
import type { FacilitatorActionBody } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { code, pin } = await readJson<FacilitatorActionBody>(request);
    const result = await getFacilitatorState(code, pin);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
