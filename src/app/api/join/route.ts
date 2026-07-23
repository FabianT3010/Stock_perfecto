import { joinSession } from "@/lib/server/store";
import { readJson, toErrorResponse } from "@/lib/server/http";
import type { JoinBody } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { code, name } = await readJson<JoinBody>(request);
    if (!code) return Response.json({ error: "Falta el código de sala." }, { status: 400 });
    const result = await joinSession(code, name);
    return Response.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
