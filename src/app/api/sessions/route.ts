import { createSession } from "@/lib/server/store";
import { readJson, toErrorResponse } from "@/lib/server/http";
import type { CreateSessionBody } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await readJson<CreateSessionBody>(request);
    const result = await createSession(body);
    return Response.json(result, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
