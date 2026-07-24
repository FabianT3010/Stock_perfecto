import { updateRound } from "@/lib/v2/store/rounds";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";

type Body = {
  code: string;
  pin: string;
  roundNumber: number;
  demands?: { productId: string; planned: number }[];
  event?: { headline: string; description: string; icon: string };
  title?: string;
};

export async function POST(request: Request) {
  try {
    const { code, pin, roundNumber, ...patch } = await readJson<Body>(request);
    return Response.json(await updateRound(code, pin, roundNumber, patch));
  } catch (e) {
    return toErrorResponse(e);
  }
}
