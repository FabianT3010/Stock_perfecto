import { getTeamState } from "@/lib/v2/store/sessions";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";

type Body = { code: string; teamId: string; token: string };

export async function POST(request: Request) {
  try {
    const { code, teamId, token } = await readJson<Body>(request);
    const result = await getTeamState(code, teamId, token);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
