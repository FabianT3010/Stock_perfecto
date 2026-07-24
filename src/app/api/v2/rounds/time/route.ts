import { setRoundTime } from "@/lib/v2/store/rounds";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";

type TimeBody = {
  code: string;
  pin: string;
  roundNumber: number;
  seconds: number;
};

export async function POST(request: Request) {
  try {
    const { code, pin, roundNumber, seconds } = await readJson<TimeBody>(request);
    if (!code || !pin || !roundNumber || !Number.isFinite(Number(seconds))) {
      return Response.json({ error: "Faltan datos para actualizar el tiempo." }, { status: 400 });
    }
    return Response.json(await setRoundTime(code, pin, roundNumber, seconds));
  } catch (error) {
    return toErrorResponse(error);
  }
}
