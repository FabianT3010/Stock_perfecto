import { setRegistration } from "@/lib/v2/store/facilitator";
import { readJson, toErrorResponse } from "@/lib/v2/store/http";

type RegistrationBody = {
  code: string;
  pin: string;
  open: boolean;
};

export async function POST(request: Request) {
  try {
    const { code, pin, open } = await readJson<RegistrationBody>(request);
    if (!code || !pin || typeof open !== "boolean") {
      return Response.json({ error: "Faltan credenciales o estado de inscripción." }, { status: 400 });
    }
    return Response.json(await setRegistration(code, pin, open));
  } catch (error) {
    return toErrorResponse(error);
  }
}
