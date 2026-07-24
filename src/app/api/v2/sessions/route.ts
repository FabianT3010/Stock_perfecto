import { createSession } from "@/lib/v2/store/sessions";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";
import type { CreateSessionBody } from "@/lib/v2/types";

export async function POST(request: Request) {
  try {
    const body = await readJson<CreateSessionBody>(request);
    const result = await createSession(body);
    return Response.json(result, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
