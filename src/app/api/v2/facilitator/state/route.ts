import { getFacilitatorState } from "@/lib/v2/store/facilitator";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";
import type { FacilitatorActionBody } from "@/lib/v2/types";

export async function POST(request: Request) {
  try {
    const { code, pin } = await readJson<FacilitatorActionBody>(request);
    return Response.json(await getFacilitatorState(code, pin));
  } catch (e) {
    return toErrorResponse(e);
  }
}
