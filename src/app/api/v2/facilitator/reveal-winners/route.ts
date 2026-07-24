import { revealWinners } from "@/lib/v2/store/facilitator";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";

type Body = { code: string; pin: string };

export async function POST(request: Request) {
  try {
    const { code, pin } = await readJson<Body>(request);
    if (!code || !pin) {
      return Response.json({ error: "Faltan credenciales." }, { status: 400 });
    }
    return Response.json(await revealWinners(code, pin));
  } catch (error) {
    return toErrorResponse(error);
  }
}
