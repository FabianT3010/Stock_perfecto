import { kickTeam } from "@/lib/v2/store/facilitator";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";

type Body = { code: string; pin: string; teamId: string };

export async function POST(request: Request) {
  try {
    const { code, pin, teamId } = await readJson<Body>(request);
    return Response.json(await kickTeam(code, pin, teamId));
  } catch (e) {
    return toErrorResponse(e);
  }
}
