import { joinTeam } from "@/lib/v2/store/sessions";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";
import type { JoinBody } from "@/lib/v2/types";

export async function POST(request: Request) {
  try {
    const { code, teamName, members, token } = await readJson<JoinBody>(request);
    if (!code) return Response.json({ error: "Falta el código de sala." }, { status: 400 });
    const result = await joinTeam(code, teamName, members ?? [], token);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
